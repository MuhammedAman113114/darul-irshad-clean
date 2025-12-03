import { ReactNode } from "react";

interface DashboardTileProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: {
    count: number;
    type: "info" | "warning" | "error";
  };
  isPrincipalOnly?: boolean;
  role?: string;
}

export default function DashboardTile({
  title,
  description,
  icon,
  onClick,
  badge,
  isPrincipalOnly = false,
  role = "teacher"
}: DashboardTileProps) {
  if (isPrincipalOnly && role !== "principal") {
    return null;
  }
  
  const isTeacher = role === "teacher";
  const isPrincipal = role === "principal";
  
  const bgColorClass = isPrincipal && isPrincipalOnly 
    ? "bg-principal-light text-principal-primary" 
    : "bg-teacher-light text-teacher-primary";
  
  let badgeColor = "bg-teacher-light text-teacher-primary";
  if (badge) {
    if (badge.type === "warning") badgeColor = "bg-accent bg-opacity-20 text-accent";
    if (badge.type === "error") badgeColor = "bg-error bg-opacity-20 text-error";
  }

  return (
    <div 
      className={`dashboard-tile bg-white rounded-xl shadow-sm p-5 flex flex-col relative
        hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer
        border-l-4 ${isPrincipal && isPrincipalOnly ? 'border-principal-primary' : 'border-teacher-primary'}
      `}
      onClick={onClick}
    >
      {badge && (
        <div className={`absolute top-3 right-3 ${badgeColor} h-6 w-6 flex items-center justify-center rounded-full shadow-sm`}>
          <span className="text-xs font-semibold">{badge.count}</span>
        </div>
      )}
      <div className={`${bgColorClass} rounded-full h-12 w-12 flex items-center justify-center mb-3 shadow-sm`}>
        {icon}
      </div>
      <h3 className="font-medium text-gray-800 text-base">{title}</h3>
      <p className="text-gray-500 text-xs mt-1.5">{description}</p>
      
      {/* Subtle indicator showing the tile is clickable */}
      <div className="absolute bottom-3 right-3 opacity-40">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.5 5L15.5 12L8.5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
