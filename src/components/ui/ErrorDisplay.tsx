interface ErrorDisplayProps {
  title: string;
  message: string;
}

export function ErrorDisplay({ title, message }: ErrorDisplayProps) {
  return (
    <div className="text-center p-4">
      <h2 className="text-lg font-semibold text-red-600 mb-2">{title}</h2>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
} 