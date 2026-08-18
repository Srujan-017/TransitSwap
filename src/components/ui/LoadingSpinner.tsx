interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
  fullPage?: boolean
}

const sizeMap = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" }

export default function LoadingSpinner({ size = "md", text, fullPage = false }: LoadingSpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizeMap[size]} border-3 border-navy-200 border-t-brand-500 rounded-full animate-spin`} />
      {text && <p className="text-sm text-navy-500 font-medium">{text}</p>}
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
