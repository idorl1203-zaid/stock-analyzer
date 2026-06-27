import type { Metadata } from "next";
import LegalDoc, { type LegalContent } from "@/components/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy Policy — StockAI",
  description: "How StockAI handles your data.",
};

const PRIVACY: LegalContent = {
  title: { en: "Privacy Policy", he: "מדיניות פרטיות" },
  updated: { en: "Last updated: June 2026", he: "עודכן לאחרונה: יוני 2026" },
  intro: {
    en: "This Privacy Policy explains what information StockAI collects, how we use it, and the choices you have. We built StockAI to keep your data minimal and, wherever possible, on your own device.",
    he: "מדיניות פרטיות זו מסבירה איזה מידע StockAI אוסף, כיצד אנו משתמשים בו, ואילו אפשרויות עומדות לרשותכם. בנינו את StockAI כך שאיסוף הנתונים יהיה מינימלי, וככל האפשר — יישמר על המכשיר שלכם.",
  },
  sections: [
    {
      heading: { en: "Information We Collect", he: "איזה מידע אנו אוספים" },
      body: [
        { en: "Account information: when you sign up, our authentication provider Clerk collects your email address and basic profile details needed to create and secure your account.", he: "פרטי חשבון: בעת ההרשמה, ספק ההזדהות שלנו Clerk אוסף את כתובת הדוא״ל ופרטי פרופיל בסיסיים הדרושים ליצירת החשבון ולאבטחתו." },
        { en: "Content you provide: chart images you upload are sent to Anthropic (Claude) to generate an analysis. We do not store your chart images on our servers after processing.", he: "תוכן שאתם מספקים: תמונות הגרפים שאתם מעלים נשלחות ל-Anthropic (Claude) לצורך הפקת ניתוח. איננו שומרים את תמונות הגרפים בשרתים שלנו לאחר העיבוד." },
      ],
    },
    {
      heading: { en: "Where Your Data Lives", he: "היכן נשמרים הנתונים שלכם" },
      body: [
        { en: "Your analyses, watchlist, trading journal and settings are stored locally in your browser (localStorage) — not on our servers. They stay on the device you used and are under your control.", he: "הניתוחים, רשימת המעקב, יומן המסחר וההגדרות שלכם נשמרים מקומית בדפדפן (localStorage) — לא בשרתים שלנו. הם נשארים על המכשיר שבו השתמשתם ותחת שליטתכם." },
      ],
    },
    {
      heading: { en: "How We Use Information", he: "כיצד אנו משתמשים במידע" },
      body: [
        { en: "We use account data to authenticate you and keep your account secure, and content you provide to generate the requested analysis. We do not sell your personal data.", he: "אנו משתמשים בנתוני החשבון כדי לאמת אתכם ולשמור על אבטחת החשבון, ובתוכן שאתם מספקים כדי להפיק את הניתוח המבוקש. איננו מוכרים את המידע האישי שלכם." },
      ],
    },
    {
      heading: { en: "Third-Party Services", he: "שירותי צד שלישי" },
      body: [
        { en: "We rely on Clerk (authentication), Anthropic / Claude (AI analysis), Yahoo Finance / Nasdaq (market data), Brave Search (news) and Vercel (hosting). Each processes data under its own privacy policy.", he: "אנו נעזרים ב-Clerk (הזדהות), Anthropic / Claude (ניתוח AI), Yahoo Finance / Nasdaq (נתוני שוק), Brave Search (חדשות) ו-Vercel (אחסון). כל אחד מהם מעבד נתונים בהתאם למדיניות הפרטיות שלו." },
      ],
    },
    {
      heading: { en: "Cookies", he: "עוגיות" },
      body: [
        { en: "We use essential cookies set by Clerk to keep you signed in. We do not use third-party advertising cookies.", he: "אנו עושים שימוש בעוגיות חיוניות שמוגדרות על ידי Clerk כדי לשמור על מצב ההתחברות שלכם. איננו עושים שימוש בעוגיות פרסום של צד שלישי." },
      ],
    },
    {
      heading: { en: "Your Choices & Rights", he: "האפשרויות והזכויות שלכם" },
      body: [
        { en: "You can clear your locally stored data at any time from within the app or by clearing your browser storage. You may delete your account, which removes your authentication record at Clerk. To exercise other rights, contact us.", he: "תוכלו למחוק את הנתונים השמורים מקומית בכל עת מתוך האפליקציה או על ידי ניקוי אחסון הדפדפן. תוכלו למחוק את חשבונכם, פעולה שמסירה את רישום ההזדהות שלכם ב-Clerk. למימוש זכויות נוספות — צרו קשר." },
      ],
    },
    {
      heading: { en: "Children’s Privacy", he: "פרטיות ילדים" },
      body: [
        { en: "StockAI is not directed to anyone under 18, and we do not knowingly collect data from minors.", he: "StockAI אינו מיועד למשתמשים מתחת לגיל 18, ואיננו אוספים ביודעין מידע מקטינים." },
      ],
    },
    {
      heading: { en: "Changes & Contact", he: "שינויים ויצירת קשר" },
      body: [
        { en: "We may update this policy from time to time and will revise the date above. For any privacy question, contact us at support@stockai.app.", he: "אנו עשויים לעדכן מדיניות זו מעת לעת ונעדכן את התאריך שלמעלה בהתאם. לכל שאלה בנושא פרטיות, כתבו לנו ל-support@stockai.app." },
      ],
    },
  ],
};

export default function PrivacyPage() {
  return <LegalDoc doc={PRIVACY} />;
}
