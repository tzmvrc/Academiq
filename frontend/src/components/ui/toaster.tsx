import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => {
        return (
          <Toast
            key={id}
            {...props}
            className="
              data-[state=open]:animate-in
              data-[state=closed]:animate-out
              data-[state=open]:fade-in-0
              data-[state=closed]:fade-out-80
              data-[state=open]:slide-in-from-top-full
              data-[state=closed]:slide-out-to-right-full
              duration-300
            "
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>

            {action}
            <ToastClose />
          </Toast>
        );
      })}

      <ToastViewport />
    </ToastProvider>
  );
}
