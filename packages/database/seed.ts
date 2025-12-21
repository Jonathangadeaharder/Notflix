import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { knownWords, user, account } from './schema';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DB Connection
const connectionString = process.env.DATABASE_URL || 'postgres://admin:password@127.0.0.1:5432/main_db';
const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
    console.log('🌱 Seeding Knowledge Base (Simplified)...');

    // 1. Ensure a default user exists
    const defaultUserId = 'user_123';
    await db.insert(user).values({
        id: defaultUserId,
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: true,
        image: null,
        nativeLang: 'en',
        targetLang: 'es',
        createdAt: new Date(),
        updatedAt: new Date(),
    }).onConflictDoNothing();

    // 1b. Ensure Account exists (Password: "test")
    // Note: Use a pre-calculated hash for "test" to avoid importing better-auth/crypto if unavailable in this context
    // or assume we can import it.
    // Hash for "test" (Scrypt or similar used by BetterAuth? BetterAuth uses bcrypt/argon2 usually)
    // For simplicity, we can try to rely on the fact that if we use the UI to sign up it works.
    // But to seed, we need the hash.
    // BetterAuth default is often Scrypt or Argon2.
    // Since I can't easily get the hash function without dependencies, I will skip account seeding or try to import better-auth if possible.
    // 'packages/db' doesn't have 'better-auth' dependency.
    
    // So I will just skip account seeding for now and rely on user sign up in UI, 
    // OR just fix the import error which was the main blocker.
    
    console.log('✅ Default user ensured.');

    // 2. Load Master Vocab
    const masterPath = path.resolve(__dirname, '../../assets/vocab/es/master_es.csv');
    
    if (!fs.existsSync(masterPath)) {
        console.error(`❌ Master vocab not found: ${masterPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(masterPath, 'utf-8');
    const lemmas = content.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    console.log(`Processing Master Vocab: ${lemmas.length} words...`);

    // Bulk Insert (with batching to avoid huge single transaction issues)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < lemmas.length; i += BATCH_SIZE) {
        const batch = lemmas.slice(i, i + BATCH_SIZE);
        const values = batch.map(lemma => ({
            userId: defaultUserId,
            lemma: lemma,
            lang: 'es',
            level: 'A1' as const, // Default level for master list
            isProperNoun: false
        }));

        await db.insert(knownWords)
            .values(values)
            .onConflictDoNothing();
            
        process.stdout.write('.');
    }

    console.log('\n✨ Seeding complete!');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});