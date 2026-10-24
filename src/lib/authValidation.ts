export interface FieldValidation {
  valid: boolean
  message: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateName(value: string): FieldValidation {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'الاسم مطلوب.' }
  }
  if (trimmed.length < 2) {
    return { valid: false, message: 'الاسم قصير جداً (حرفان على الأقل).' }
  }
  if (trimmed.length > 60) {
    return { valid: false, message: 'الاسم طويل جداً.' }
  }
  return { valid: true, message: null }
}

export function validateEmail(value: string): FieldValidation {
  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: false, message: 'البريد الإلكتروني مطلوب.' }
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, message: 'صيغة البريد الإلكتروني غير صحيحة.' }
  }
  return { valid: true, message: null }
}

export function validatePassword(
  value: string,
  { isRegister }: { isRegister: boolean },
): FieldValidation {
  if (!value) {
    return { valid: false, message: 'كلمة المرور مطلوبة.' }
  }
  if (value.length < 6) {
    return {
      valid: false,
      message: 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل.',
    }
  }
  if (isRegister && value.length < 8) {
    return {
      valid: true,
      message: 'يُفضَّل ٨ أحرف أو أكثر لحماية أفضل.',
    }
  }
  if (isRegister && !/[0-9]/.test(value)) {
    return {
      valid: true,
      message: 'أضف رقماً لزيادة قوة كلمة المرور.',
    }
  }
  return { valid: true, message: null }
}

export function passwordStrength(value: string): {
  score: 0 | 1 | 2 | 3
  label: string
} {
  if (!value) return { score: 0, label: '' }
  let score = 0
  if (value.length >= 6) score += 1
  if (value.length >= 10) score += 1
  if (/[A-Za-z\u0600-\u06FF]/.test(value) && /[0-9]/.test(value)) score += 1
  if (/[^A-Za-z0-9\u0600-\u06FF]/.test(value)) score += 1
  const clamped = Math.min(score, 3) as 0 | 1 | 2 | 3
  const labels = ['', 'ضعيفة', 'متوسطة', 'قوية'] as const
  return { score: clamped, label: labels[clamped] }
}
