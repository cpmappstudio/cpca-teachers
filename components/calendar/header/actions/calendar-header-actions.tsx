export default function CalendarHeaderActions({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      {children}
    </div>
  )
}
