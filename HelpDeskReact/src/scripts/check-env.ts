
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("Available Env Keys:", Object.keys(process.env).filter(k => !k.startsWith('npm_')));
