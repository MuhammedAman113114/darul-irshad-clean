import { useToast } from "@/hooks/use-toast";

export const useNotification = () => {
  const { toast } = useToast();

  const showNotification = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    toast({
      title: type === "error" ? "Error" : type === "success" ? "Success" : "Info",
      description: message,
      variant: type === "error" ? "destructive" : "default",
    });
  };

  return { showNotification };
};