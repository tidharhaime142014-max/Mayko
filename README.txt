Mayko GPT

הרצה במחשב:
1. פתח את הקובץ .env (קובץ נסתר), בחר PROVIDER (gemini או anthropic) והדבק את המפתח. שמור.
2. בטרמינל בתיקייה: npm start
3. פתח: http://localhost:3000   (דרוש Node.js 18 ומעלה)

העלאה ל-Vercel:
1. העלה את התיקייה (ללא הקובץ .env - הוא כבר ב-.vercelignore ו-.gitignore).
2. ב-Settings > Environment Variables הוסף: PROVIDER ואת GEMINI_API_KEY (או ANTHROPIC_API_KEY).
3. עשה Redeploy.
