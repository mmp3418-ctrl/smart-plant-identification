/** Map Supabase / Auth error strings to friendly Arabic messages. */

export function translateAuthError(raw: string): string {
  const message = raw.toLowerCase()

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
  }
  if (message.includes('email not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.'
  }
  if (message.includes('user already registered')) {
    return 'هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.'
  }
  if (message.includes('password should be at least')) {
    return 'كلمة المرور قصيرة جداً. استخدم 6 أحرف على الأقل.'
  }
  if (message.includes('unable to validate email') || message.includes('invalid email')) {
    return 'صيغة البريد الإلكتروني غير صحيحة.'
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.'
  }
  if (message.includes('signup is disabled')) {
    return 'تسجيل الحسابات معطّل حالياً من إعدادات المشروع.'
  }

  return raw.trim() || 'حدث خطأ غير متوقع أثناء المصادقة.'
}
