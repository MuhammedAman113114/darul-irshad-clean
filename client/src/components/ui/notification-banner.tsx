import { CheckCircle, AlertCircle, XCircle, X } from "lucide-react";
import { useNotification } from "../../hooks/use-notification";

export function NotificationBanner() {
  const { notification, hideNotification } = useNotification();

  if (!notification.visible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case "success":
        return "text-green-800";
      case "error":
        return "text-red-800";
      case "warning":
        return "text-yellow-800";
      default:
        return "text-blue-800";
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 mx-auto max-w-md border-b-2 ${getBgColor()} animate-in slide-in-from-top duration-300`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {getIcon()}
          <p className={`text-sm font-medium ${getTextColor()}`}>
            {notification.message}
          </p>
        </div>
        <button
          onClick={hideNotification}
          className={`${getTextColor()} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}