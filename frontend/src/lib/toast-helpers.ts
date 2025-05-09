import { toast as baseToast } from "@/hooks/use-toast";

export const toast = {
  show: baseToast,
  success: (message: string) => {
    return baseToast({
      title: "Sucesso",
      description: message,
    });
  },

  error: (message: string) => {
    return baseToast({
      variant: "destructive",
      title: "Erro",
      description: message,
    });
  },

  info: (message: string) => {
    return baseToast({
      title: "Informação",
      description: message,
    });
  },

  warning: (message: string) => {
    return baseToast({
      title: "Aviso",
      description: message,
      variant: "destructive",
    });
  },
};
