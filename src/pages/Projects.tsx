import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Briefcase, 
  Calendar, 
  User, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

interface Project {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  client: { name: string } | null;
  boqs: any[];
}

interface Client {
  id: string;
  name: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    status: 'Active',
    startDate: '',
    endDate: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [projectsRes, clientsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/clients')
      ]);
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (clientsRes.ok) setClients(await clientsRes.json());
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success(editingProject ? 'Project updated' : 'Project created');
        setShowAddModal(false);
        setEditingProject(null);
        setFormData({
          name: '',
          description: '',
          clientId: '',
          status: 'Active',
          startDate: '',
          endDate: ''
        });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save project');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Project deleted');
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete project');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      clientId: project.clientId || '',
      status: project.status,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : ''
    });
    setShowAddModal(true);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-emerald-400 bg-emerald-400/10';
      case 'On Hold': return 'text-amber-400 bg-amber-400/10';
      case 'Completed': return 'text-blue-400 bg-blue-400/10';
      case 'Cancelled': return 'text-rose-400 bg-rose-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <Clock size={14} />;
      case 'On Hold': return <AlertCircle size={14} />;
      case 'Completed': return <CheckCircle2 size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Projects</h1>
          <p className="text-slate-400 mt-1 font-medium">Manage and track all ongoing projects</p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setFormData({
              name: '',
              description: '',
              clientId: '',
              status: 'Active',
              startDate: '',
              endDate: ''
            });
            setShowAddModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/20 self-start"
        >
          <Plus size={20} />
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Total Projects</p>
              <h3 className="text-2xl font-black text-white">{projects.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Active</p>
              <h3 className="text-2xl font-black text-white">
                {projects.filter(p => p.status === 'Active').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Completed</p>
              <h3 className="text-2xl font-black text-white">
                {projects.filter(p => p.status === 'Completed').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search projects or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Project Name</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Client</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Timeline</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">BOQs</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">Loading projects...</td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-bold">No projects found</td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black">
                          {project.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-white">{project.name}</div>
                          <div className="text-xs text-slate-500 font-medium line-clamp-1">{project.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300 font-bold">
                        <User size={14} className="text-slate-500" />
                        {project.client?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)}
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                        <Calendar size={14} />
                        {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'N/A'}
                        <ChevronRight size={12} />
                        {project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-white px-2 py-1 rounded-lg text-xs font-black">
                          {project.boqs?.length || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(project)}
                          className="p-2 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(project.id)}
                          className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-800 bg-slate-800/50">
                <h2 className="text-2xl font-black text-white">
                  {editingProject ? 'Edit Project' : 'Create New Project'}
                </h2>
                <p className="text-slate-400 font-medium">Enter project details below</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Project Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                      placeholder="e.g. Skyline Residency"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold min-h-[100px]"
                      placeholder="Project details and scope..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Client</label>
                    <select
                      value={formData.clientId || ''}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    >
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate || ''}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 rounded-2xl font-black text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-xl shadow-indigo-500/20"
                  >
                    {isSaving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        title="Delete Project"
        message="Are you sure you want to delete this project? This will also affect associated BOQs. This action cannot be undone."
        confirmText="Delete Project"
        variant="danger"
      />
    </div>
  );
};

export default Projects;
