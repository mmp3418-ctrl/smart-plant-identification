import type { SiteContent } from '@/types/content'

/**
 * Seed content for the app. Replace / merge from Supabase or an Admin CMS
 * via `ContentProvider` without changing page components.
 */
export const siteContent: SiteContent = {
  version: 1,
  updatedAt: '2026-10-24T00:00:00.000Z',
  nav: {
    brandName: 'نبْتة',
    brandSubtitle: 'تعريف وملاءمة بيئية',
    captureCta: 'التقط صورة',
    links: [
      { id: 'nav-home', label: 'الرئيسية', to: '/', end: true },
      { id: 'nav-identify', label: 'تعريف النبات', to: '/identify' },
      { id: 'nav-directory', label: 'دليل النباتات', to: '/directory' },
    ],
  },
  home: {
    hero: {
      id: 'home-hero',
      badge: {
        id: 'hero-badge',
        label: 'منصة تعريف نباتية متقدمة',
        variant: 'brand',
      },
      title: 'عرّف نباتك من صورة،',
      titleHighlight: 'واكتشف العناية والأمراض',
      subtitle:
        'تحليل بصري دقيق مع ملف عناية شامل: الري، الإضاءة، التربة، الرطوبة، الإكثار، وأبرز الأمراض وطرق الوقاية والعلاج — بواجهة عربية فاخرة.',
      searchPlaceholder: 'ابحث عن نبات بالاسم العربي أو العلمي…',
      ctas: [
        {
          id: 'cta-capture',
          label: 'التقاط / رفع صورة',
          to: '/identify',
          variant: 'primary',
          icon: 'camera',
        },
        {
          id: 'cta-upload',
          label: 'رفع من المعرض',
          to: '/identify?mode=upload',
          variant: 'outline',
          icon: 'upload',
        },
      ],
    },
    popularSection: {
      id: 'popular',
      title: 'نباتات شائعة',
      description: 'مجموعة مختارة للبدء السريع في الاستكشاف',
      actionLabel: 'الدليل كاملاً',
      actionTo: '/directory',
    },
    features: [
      {
        id: 'feat-vision',
        title: 'تعريف بالصورة',
        description:
          'كاميرا أو رفع ملف مع تحليل متعدد المراحل وملف نتائج غني بالعناية والصحة.',
        accent: 'amber',
      },
      {
        id: 'feat-search',
        title: 'بحث وتصفية',
        description:
          'ابحث بالعربية أو بالاسم العلمي، وفلتر حسب التربة والبيئة بسهولة.',
        accent: 'gold',
      },
      {
        id: 'feat-health',
        title: 'عناية وأمراض',
        description:
          'جداول ري وإضاءة وتربة، مع أعراض الأمراض الشائعة والوقاية والعلاج.',
        accent: 'slate',
      },
    ],
  },
  about: {
    title: 'عن المشروع',
    intro:
      '«نبْتة» منصة لتعريف النباتات وتقديم معلومات الملاءمة البيئية والعناية وصحة النبات، طُوّرت كمشروع تخرج جامعي يدمج واجهة عربية حديثة مع مسار تعريفي بالصورة ودليل نباتات قابل للبحث.',
    blocks: [
      {
        id: 'goals',
        title: 'الأهداف',
        bullets: [
          'تيسير التعرف على النباتات للمستخدم العربي عبر الصورة.',
          'تقديم بيانات منظمة عن التربة، البيئة، الري، الرطوبة، والإكثار.',
          'عرض ملف صحة وأمراض عملي (أعراض، وقاية، علاج) لكل نتيجة تعريف.',
          'بناء أساس تقني جاهز للربط مع لوحة إدارة وقاعدة محتوى ديناميكية.',
        ],
      },
      {
        id: 'disclaimer',
        title: 'إخلاء مسؤولية أكاديمي',
        tone: 'warning',
        body: 'المحتوى الحالي لأغراض تعليمية وبحثية. نتائج التعريف والإرشادات الصحية لا تغني عن التحقق الميداني أو استشارة مختص زراعي، خاصة في الاستخدامات الغذائية أو الطبية.',
      },
    ],
  },
  footer: {
    brandName: 'نبْتة',
    tagline:
      'منصة عربية لتعريف النباتات من الصور وتقديم معلومات العناية والملاءمة البيئية وصحة النبات — مشروع تخرج جامعي لأغراض تعليمية وبحثية.',
    linksTitle: 'روابط',
    links: [
      { id: 'f-home', label: 'الرئيسية', to: '/' },
      { id: 'f-identify', label: 'تعريف النبات', to: '/identify' },
      { id: 'f-directory', label: 'دليل النباتات', to: '/directory' },
      { id: 'f-about', label: 'عن المشروع', to: '/about' },
    ],
    disclaimerTitle: 'إخلاء مسؤولية',
    disclaimer:
      'النتائج إرشادية وليست بديلاً عن الاستشارة الزراعية المتخصصة أو الدراسات الميدانية المعتمدة. استخدم المعلومات بحذر وفي سياق تعليمي.',
    copyrightSuffix:
      'نبْتة — نظام التعريف الذكي بالنباتات وتقييم الملاءمة البيئية. مشروع تخرج جامعي.',
    englishLine: 'Smart Plant Identification & Environmental Suitability',
  },
  auth: {
    loginTitle: 'تسجيل الدخول',
    registerTitle: 'إنشاء حساب',
    loginSubtitle: 'ادخل لمتابعة المفضلة وسجل التعريف عبر حسابك.',
    registerSubtitle: 'أنشئ حساباً لمزامنة ملفك الشخصي عبر المنصة.',
    localModeHint: 'وضع محلي للتطوير — تُحفظ الجلسة في المتصفح فقط.',
    nameLabel: 'الاسم',
    namePlaceholder: 'اسمك الكامل',
    emailLabel: 'البريد الإلكتروني',
    emailPlaceholder: 'name@example.com',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    passwordHint: '٦ أحرف على الأقل، يُفضَّل مزج أحرف وأرقام',
    loginSubmit: 'دخول',
    registerSubmit: 'إنشاء الحساب',
    loginTab: 'دخول',
    registerTab: 'حساب جديد',
  },
  identify: {
    title: 'تعريف النبات',
    subtitle: 'كاميرا أو رفع صورة — ثم معاينة قبل التحليل',
    analyzeHint: 'راجع المعاينة ثم اضغط «تحليل الصورة» لبدء التحليل المتقدم',
    dragHint: 'اسحب صورة هنا أو استخدم زر الرفع / الكاميرا',
    dropHint: 'أفلت الصورة هنا للمعاينة',
    tipLine:
      'يمكنك أيضاً سحب صورة وإفلاتها داخل الإطار · أفضل النتائج مع إضاءة جيدة وقرب من الورقة',
    analyzeButton: 'تحليل الصورة',
    resetButton: 'إعادة',
    retryButton: 'المحاولة من جديد',
    loadingSteps: [
      {
        id: 'scan',
        label: 'جارٍ مسح أنماط الأوراق…',
        durationMs: 1600,
      },
      {
        id: 'markers',
        label: 'تحليل العلامات الشكلية والتصنيفية…',
        durationMs: 1800,
      },
      {
        id: 'profile',
        label: 'بناء ملف العناية والأمراض…',
        durationMs: 2000,
      },
      {
        id: 'finalize',
        label: 'تجهيز النتيجة النهائية…',
        durationMs: 1400,
      },
    ],
  },
}
