import path from 'node:path';

export function isPathWithinRoot(
  candidatePath: string,
  rootPath: string,
): boolean {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  const relativePath = path.relative(resolvedRoot, resolvedCandidate);

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  );
}

export function toRelativePathFromRoot(
  candidatePath: string,
  rootPath: string,
): string | null {
  if (!isPathWithinRoot(candidatePath, rootPath)) {
    return null;
  }

  return path
    .relative(path.resolve(rootPath), path.resolve(candidatePath))
    .replace(/\\/g, '/');
}

export function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}
