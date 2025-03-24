import { Job } from '../../lib/types/job';

interface JobListProps {
  jobs: Job[];
}

export default function JobList({ jobs }: JobListProps) {
  return (
    <div className="grid gap-4">
      {jobs.map((job) => {
        const formattedDate = job.posted_at 
          ? new Date(job.posted_at).toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : 'Date not available';

        return (
          <div key={`${job.title}-${job.company}`} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{job.title}</h2>
            <p className="text-gray-600">{job.company}</p>
            <p>{job.location}</p>
            <p>Source: {job.source}</p>
            <p>Posted: {formattedDate}</p>
            <a 
              href={job.url} 
              target="_blank" 
              className="text-blue-500 hover:underline"
              rel="noopener noreferrer"
            >
              View Job
            </a>
          </div>
        );
      })}
    </div>
  );
}