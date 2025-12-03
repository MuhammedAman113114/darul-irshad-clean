import { X } from 'lucide-react';
import { useNotification } from '@/hooks/use-notification';
import { cn } from '@/lib/utils';

export default function Notification() {
  const { notification, hideNotification } = useNotification();
  
  // Generate dynamic styles based on notification type
  const getStyles = () => {
    switch(notification.type) {
      case 'success':
        return {
          bg: 'bg-success/95',
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          title: 'Success'
        };
      case 'error':
        return {
          bg: 'bg-error/95',
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          title: 'Error'
        };
      case 'warning':
        return {
          bg: 'bg-warning/95',
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
          title: 'Warning'
        };
      default:
        return {
          bg: 'bg-teacher-primary/95',
          icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          title: 'Notice'
        };
    }
  };
  
  const styles = getStyles();
  
  return (
    <div
      className={cn(
        `fixed bottom-5 inset-x-4 flex items-start p-4 text-white rounded-xl shadow-xl 
         max-w-md mx-auto z-50 backdrop-blur-sm border border-white/20
         transform transition-all duration-300 ${styles.bg}`,
        notification.visible 
          ? "translate-y-0 opacity-100" 
          : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      <div className="mr-3 pt-0.5">
        {styles.icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm tracking-wide">
          {styles.title}
        </p>
        <p className="text-sm text-white/85 mt-0.5 leading-tight">{notification.message}</p>
      </div>
      <button 
        onClick={hideNotification} 
        className="text-white/80 hover:text-white ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
