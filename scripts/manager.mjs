import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { platform } from 'node:os';

// --- Configuration ---
const ROOT = resolve('.');
const APPS_DIR = join(ROOT, 'apps');
const AI_DIR = join(APPS_DIR, 'ai-service');

const IS_WIN = platform() === 'win32';
let IS_WSL = false;
if (platform() === 'linux') {
    try {
        const fs = await import('node:fs');
        const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
        if (version.includes('microsoft') || version.includes('wsl')) IS_WSL = true;
    } catch (e) {
        try {
            const version = execSync('uname -r').toString().toLowerCase();
            if (version.includes('microsoft')) IS_WSL = true;
        } catch (e2) {}
    }
}

const ENV = {
    ...process.env,
    DATABASE_URL: "postgres://admin:password@localhost:5432/main_db",
    AI_SERVICE_URL: "http://localhost:8000",
    AI_SERVICE_API_KEY: "dev_secret_key",
    UPLOAD_DIR: join(ROOT, 'media/uploads'),
    MEDIA_ROOT: join(ROOT, 'media'),
    LOGS_DIR: join(ROOT, 'logs'),
    BETTER_AUTH_SECRET: "long_secret_key_for_dev_only_1234567890",
    RUNNING_IN_DOCKER: "false"
};

function log(msg) { console.log(`\x1b[36m[Manager]\x1b[0m ${msg}`); }
function error(msg) { console.error(`\x1b[31m[Error]\x1b[0m ${msg}`); }

function getDockerCmd() {
    if (IS_WSL || IS_WIN) {
        try { execSync('docker.exe --version', { stdio: 'ignore' }); return 'docker.exe'; } catch (e) { return 'docker'; }
    }
    return 'docker';
}

function runSync(cmd, cwd = ROOT) {
    try { execSync(cmd, { cwd, stdio: 'inherit', env: ENV }); } catch (e) { error(`Command failed: ${cmd}`); process.exit(1); }
}

async function killPort(port) {
    log(`Cleaning up port ${port}...`);
    try {
        if (IS_WIN || IS_WSL) {
             try { execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' }); } catch (e) {}
             if (IS_WIN) {
                 try {
                     const pid = execSync(`netstat -ano | findstr :${port}`).toString().split(/\s+/).pop();
                     if (pid) execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                 } catch(e) {}
             }
        } else {
            try { execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' }); } catch (e) {}
        }
    } catch (e) {}
}

async function main() {
    log(`Starting Notflix Dev Environment...`);
    log(`Platform: ${platform()} (WSL: ${IS_WSL})`);

    mkdirSync(join(ROOT, 'media', 'uploads'), { recursive: true });
    mkdirSync(join(ROOT, 'logs'), { recursive: true });

    await killPort(8000);
    await killPort(5173);

    const docker = getDockerCmd();
    try {
        const isRunning = execSync(`${docker} ps --filter "name=notflix-db" --format "{{.Names}}"`).toString().trim() === 'notflix-db';
        if (!isRunning) {
            const exists = execSync(`${docker} ps -a --filter "name=notflix-db" --format "{{.Names}}"`).toString().trim() === 'notflix-db';
            if (exists) {
                execSync(`${docker} start notflix-db`);
            } else {
                execSync(`${docker} run -d --name notflix-db -p 5432:5432 -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=password -e POSTGRES_DB=main_db -v notflix-pg-data:/var/lib/postgresql/data postgres:16-alpine`);
            }
        }
    } catch (e) { error('Docker check failed.'); }

    log('Waiting for DB...');
    await new Promise(r => setTimeout(r, 2000));

    if (!existsSync(join(ROOT, 'node_modules'))) runSync('npm install', ROOT);
    runSync('npm run db:push --workspace=@notflix/database', ROOT);

    log('Setting up AI Service...');
    
    // --- FORCE LINUX SYSTEM PYTHON ON WSL ---
    let pythonExec = 'python3';
    
    if (IS_WIN) {
        const venvDir = join(AI_DIR, '.venv');
        if (!existsSync(venvDir)) {
             try { runSync(`python -m venv .venv`, AI_DIR); } catch(e) {}
        }
        pythonExec = join(venvDir, 'Scripts', 'python.exe');
        if (!existsSync(pythonExec)) pythonExec = 'python';
    }

    log(`Using Python: ${pythonExec}`);
    
    // Install Deps
    try {
        const args = ['-m', 'pip', 'install', '-r', 'requirements.txt'];
        if (!IS_WIN) args.push('--user');
        // Force uvicorn install if missing
        args.push('uvicorn'); 
        
        execSync(`${pythonExec} ${args.join(' ')}`, { cwd: AI_DIR, stdio: 'inherit' });
    } catch (e) { log('Pip install warn'); }

    // Start AI
    const aiLog = join(ROOT, 'logs', 'ai-service.log');
    const aiProcess = spawn(pythonExec, ['-m', 'uvicorn', 'main:app', '--reload', '--port', '8000'], {
        cwd: AI_DIR,
        env: ENV,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const fs = await import('node:fs');
    const logStream = fs.createWriteStream(aiLog);
    aiProcess.stdout.pipe(logStream);
    aiProcess.stderr.pipe(logStream);

    log(`AI Service running (PID: ${aiProcess.pid})`);

    // Start Platform
    const cleanup = () => { aiProcess.kill(); process.exit(); };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', () => aiProcess.kill());

    spawn('npm', ['run', 'dev', '--workspace=@notflix/platform'], {
        cwd: ROOT,
        env: ENV,
        stdio: 'inherit'
    }).on('close', cleanup);
}

main().catch(e => { error(e.message); process.exit(1); });
