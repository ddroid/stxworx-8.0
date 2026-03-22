import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Filter, Search } from 'lucide-react';
import * as Shared from '../shared';
import { getCategories, getProjects, toAppJob } from '../lib/api';
import type { ApiCategory, AppJob } from '../types/job';

export const ExploreJobsPage = () => {
  const { userRole } = Shared.useWallet();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AppJob | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('All');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<AppJob[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    const loadJobsData = async () => {
      try {
        const [projectRows, categoryRows] = await Promise.all([
          getProjects(),
          getCategories(),
        ]);

        setJobs(projectRows.map(toAppJob));
        setCategories(categoryRows);
      } catch (error) {
        console.error('Failed to load jobs page data:', error);
      }
    };

    loadJobsData();
  }, []);

  const categoryOptions = useMemo(() => {
    const base = [
      {
        label: 'All',
        count: jobs.length,
      },
    ];

    const derived = categories.map((category) => ({
      label: category.name,
      count: jobs.filter((job) => job.category === category.name).length,
    }));

    return [...base, ...derived];
  }, [categories, jobs]);

  const currencyOptions = useMemo(() => ['All', ...new Set(jobs.map((job) => job.currency))], [jobs]);

  const visibleJobs = useMemo(() => {
    const loweredSearch = searchQuery.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesCategory = activeCategory === 'All' || job.category === activeCategory;
      const matchesCurrency = selectedCurrency === 'All' || job.currency === selectedCurrency;
      const matchesSearch =
        loweredSearch.length === 0 ||
        [job.title, job.description, job.fullDescription, job.category, job.subCategory, ...job.tags]
          .join(' ')
          .toLowerCase()
          .includes(loweredSearch);

      return matchesCategory && matchesCurrency && matchesSearch;
    });
  }, [activeCategory, jobs, searchQuery, selectedCurrency]);

  const handleApply = (job: AppJob) => {
    setSelectedJob(job);
    setIsApplyModalOpen(true);
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom">
        <div className="mb-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 md:mb-12">Explore Jobs</h1>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 mb-12">
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((cat) => (
                <button 
                  key={cat.label}
                  onClick={() => setActiveCategory(cat.label)}
                  className={`px-4 py-2 rounded-[15px] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${activeCategory === cat.label ? 'bg-white text-bg' : 'bg-surface text-muted hover:text-ink'}`}
                >
                  {cat.label} <span className="opacity-40">{cat.count}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
              <div className="relative">
                <select 
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="appearance-none bg-surface text-ink border border-border rounded-[15px] pl-4 pr-10 py-2 text-sm font-bold focus:ring-1 focus:ring-accent-orange outline-none cursor-pointer"
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency} className="bg-surface text-ink">
                      {currency === 'All' ? 'All Currencies' : currency}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
              <div className="bg-surface border border-border rounded-[15px] px-3 py-2 flex items-center gap-2 w-full sm:min-w-[220px]">
                <Search size={14} className="text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs"
                  className="bg-transparent text-sm text-ink placeholder:text-muted outline-none w-full"
                />
              </div>
              <button className="btn-outline justify-center"><Filter size={18} /> Filter</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {visibleJobs.map((job) => (
            <div key={job.id} className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-accent-orange transition-all cursor-pointer">
              <div>
                <h3 className="text-xl font-black mb-2 group-hover:text-accent-orange transition-colors">{job.title}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-muted">{job.category}</span>
                  <span className="text-muted text-xs">•</span>
                  <span className="text-xs text-muted">{job.subCategory}</span>
                </div>
                <p className="text-sm text-muted mb-4">{job.description}</p>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-ink/5 rounded-[15px] text-[10px] font-bold">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="text-left md:text-right shrink-0 w-full md:w-auto">
                <p className={`text-2xl font-black ${job.color}`}>{job.budget} {job.currency}</p>
                <p className="text-[10px] font-bold text-muted uppercase mb-4">Budget</p>
                {userRole !== 'client' && (
                  <button onClick={() => handleApply(job)} className="btn-outline py-2 px-6 text-xs">Apply Now</button>
                )}
              </div>
            </div>
          ))}
          {visibleJobs.length === 0 && (
            <div className="card p-6 text-sm text-muted">
              No jobs matched your current filters.
            </div>
          )}
        </div>
      </div>
      <Shared.JobApplyModal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} job={selectedJob} />
    </div>
  );
};
