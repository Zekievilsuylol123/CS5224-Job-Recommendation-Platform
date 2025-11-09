import { Briefcase, MapPin, Building2, DollarSign, Clock } from 'lucide-react';

interface JobHeaderProps {
  title: string;
  company: string;
  location: string;
  tags: string[];
  salary?: string;
  postedDate?: string;
  isInternSG?: boolean;
}

export default function JobHeader({ 
  title, 
  company, 
  location, 
  tags, 
  salary,
  postedDate,
  isInternSG 
}: JobHeaderProps) {
  return (
    <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 shadow-card">
      {isInternSG && (
        <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 mb-4">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          InternSG Partner
        </div>
      )}
      
      <h1 className="text-3xl font-bold text-slate-900 mb-4">{title}</h1>
      
      <div className="flex flex-wrap items-center gap-4 text-slate-600 mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span className="font-medium">{company}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <span>{location}</span>
        </div>
        {salary && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <span>{salary}</span>
          </div>
        )}
        {postedDate && (
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>{postedDate}</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, idx) => (
          <span
            key={idx}
            className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
