export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0d1a] via-[#1a1a3e] to-[#0d1a2e]">
      {children}
    </div>
  );
}
