import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Printer,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import logoPath from '@assets/BRUR_Logo_1789044011278.svg';
import simpleTemplateUrl from '@assets/simple_1789047566420.docx?url';
import professionalTemplateUrl from '@assets/professional_1789047566419.docx?url';
import modernTemplateUrl from '@assets/modern_1789047566419.docx?url';
import groupTemplateUrl from '@assets/group_1789047566416.docx?url';

const queryClient = new QueryClient();

type Design = 'simple' | 'professional' | 'modern';
type AssignmentType = 'individual' | 'group';
type Teacher = { id: number; name: string; designation: string };
type Course = { code: string; title: string; department: string };
type FormState = {
  department: string;
  assignment: string;
  session: string;
  courseTitle: string;
  courseCode: string;
  topic: string;
  teacherName: string;
  teacherDesignation: string;
  teacherDepartment: string;
  university: string;
  date: string;
  assignmentType: AssignmentType;
  studentName: string;
  studentId: string;
  registrationNo: string;
  groupMembers: string[];
  design: Design;
};

const teachers: Teacher[] = [
  { id: 50, name: 'Prof. Dr. Abu Kalam Md. Farid Ul Islam', designation: 'Professor' },
  { id: 45, name: 'Dr. Md. Mizanur Rahoman', designation: 'Professor' },
  { id: 194, name: 'Dr. Ileas Pramanik', designation: 'Professor' },
  { id: 195, name: 'Dr. Prodip Kumar Sarker', designation: 'Associate Professor' },
  { id: 196, name: 'Md. Zasim Uddin', designation: 'Associate Professor' },
  { id: 197, name: 'Md. Shamsuzzaman', designation: 'Assistant Professor' },
  { id: 198, name: 'Md. Abul Kalam Azad (On Study Leave)', designation: 'Assistant Professor' },
  { id: 200, name: 'Sanjoy Kumar Saha (On Study Leave)', designation: 'Assistant Professor' },
  { id: 201, name: 'Marjia Sultana', designation: 'Assistant Professor' },
  { id: 202, name: 'Md. Hasan Tarek', designation: 'Lecturer' },
  { id: 434, name: 'Md. Faruk Hosen', designation: 'Lecturer' },
];

const courses: Course[] = [
  { code: 'CSE 1101', title: 'Introduction to Computer Science', department: 'CSE' },
  { code: 'CSE 1203', title: 'Structured Programming', department: 'CSE' },
  { code: 'CSE 2205', title: 'Data Structures', department: 'CSE' },
  { code: 'CSE 3107', title: 'Database Management Systems', department: 'CSE' },
  { code: 'CSE 4101', title: 'Software Engineering', department: 'CSE' },
  { code: 'EEE 2103', title: 'Electrical Circuits and Measurements', department: 'EEE' },
];

const today = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const firstTeacher = teachers[0];
const initialState: FormState = {
  department: '',
  assignment: 'Assignment',
  session: '2024–2025',
  courseTitle: courses[0].title,
  courseCode: courses[0].code,
  topic: 'A thoughtful title for your assignment',
  teacherName: firstTeacher.name,
  teacherDesignation: firstTeacher.designation,
  teacherDepartment: 'Department of Computer Science and Engineering',
  university: 'Begum Rokeya University, Rangpur',
  date: today,
  assignmentType: 'individual',
  studentName: 'Your name',
  studentId: '',
  registrationNo: '',
  groupMembers: ['', '', ''],
  design: 'simple',
};

function readSaved(): FormState | null {
  try {
    const saved = localStorage.getItem('brur-cover-draft');
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<FormState>;
    return {
      ...initialState,
      ...parsed,
      department: parsed.department ?? '',
      groupMembers: Array.from({ length: 3 }, (_, index) => parsed.groupMembers?.[index] ?? ''),
      design: parsed.design ?? 'professional',
    };
  } catch {
    return null;
  }
}

function AppShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function CoverPreview({ form }: { form: FormState }) {
  const members = form.assignmentType === 'group' ? form.groupMembers.filter(Boolean) : [];
  const group = form.assignmentType === 'group';
  return (
    <div className={`cover-paper docx-cover docx-${form.design} p-7 text-center sm:p-10`}>
      <img className="docx-logo mx-auto object-contain" src={logoPath} alt="BRUR crest" data-testid="img-preview-logo" />
      <p className="docx-university">{form.university || 'Begum Rokeya University'}</p>
      <p className="docx-department">{form.department || form.teacherDepartment || 'Department'}</p>
      <p className="docx-assignment">{form.assignment || 'Assignment'}</p>
      <p className="docx-session"><strong>Session:</strong> {form.session || '2024-25'}</p>
      <p className="docx-course">Course Title: {form.courseTitle || 'Course title'}</p>
      <p className="docx-course">Course Code: {form.courseCode || 'Course code'}</p>
      <p className="docx-topic" data-testid="text-preview-topic">{form.topic || 'Assignment topic'}</p>
      <div className="docx-submission">
        <p><strong>Submitted by:</strong> {group && <span className="docx-group-label">GROUP: {members.length ? members.length : '#'}</span>}</p>
        {group ? members.map((member, index) => <p key={`preview-member-${index}`}>{member || `Member ${index + 1}`}</p>) : <><p>{form.studentName || 'Name'}</p><p>ID: {form.studentId || 'ID'}</p><p>Registration no: {form.registrationNo || 'Registration no'}</p></>}
      </div>
      <div className="docx-submitted-to">
        <p><strong>Submitted to:</strong></p>
        <p>{form.teacherName || 'Teacher name'}</p>
        <p>{form.teacherDesignation || 'Designation'}</p>
        <p>{form.teacherDepartment || 'Department'}</p>
        <p>{form.university || 'University'}</p>
      </div>
      <p className="docx-date">Date of submission: {form.date || 'Date'}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', testId, className = '' }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; testId: string; className?: string }) {
  return <label className={className}><span className="field-label">{label}</span><input className="input-shell" type={type} value={value} onChange={onChange} placeholder={placeholder} data-testid={testId} /></label>;
}

function SectionTitle({ number, icon, title, note }: { number: string; icon: ReactNode; title: string; note: string }) {
  return <div className="mb-5 flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{icon}</div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Step {number}</p><h2 className="font-display text-lg font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{note}</p></div></div>;
}

function Home() {
  const [form, setForm] = useState<FormState>(() => {
    const savedForm = readSaved();
    return savedForm ? { ...savedForm, design: 'simple', assignmentType: 'individual' } : initialState;
  });
  const [teacherQuery, setTeacherQuery] = useState('');
  const [saved, setSaved] = useState(Boolean(readSaved()));
  const [saveLabel, setSaveLabel] = useState('Save draft');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'BRUR Cover Maker · Assignment workspace';
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const filteredTeachers = useMemo(() => teachers.filter((teacher) => teacher.name.toLowerCase().includes(teacherQuery.toLowerCase()) || String(teacher.id).includes(teacherQuery)), [teacherQuery]);

  const chooseTeacher = (teacher: Teacher) => {
    setForm((current) => ({ ...current, teacherName: teacher.name, teacherDesignation: teacher.designation }));
    setTeacherQuery('');
  };
  const saveDraft = () => {
    localStorage.setItem('brur-cover-draft', JSON.stringify(form));
    setSaved(true);
    setSaveLabel('Draft saved');
    setNotice('Your cover is saved on this device.');
    window.setTimeout(() => setSaveLabel('Save draft'), 1800);
  };
  const copyPrevious = () => {
    const previous = readSaved();
    if (!previous) {
      setNotice('Save a draft first and it will be available here next time.');
      return;
    }
    setForm({ ...previous, topic: `${previous.topic} — copy`, date: today });
    setNotice('Previous assignment copied into the workspace.');
  };
  const updateMember = (index: number, value: string) => setForm((current) => ({ ...current, groupMembers: current.groupMembers.map((member, memberIndex) => memberIndex === index ? value : member) }));
  const download = async (kind: 'pdf' | 'txt' | 'doc') => {
    const title = form.topic || 'BRUR-assignment-cover';
    const cleanTitle = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const blob = kind === 'pdf'
      ? await createPdf(form)
      : kind === 'doc'
        ? await createDocx(form)
        : new Blob([coverText(form)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanTitle || 'brur-cover'}.${kind === 'doc' ? 'docx' : kind}`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
    setNotice(`${kind === 'doc' ? 'DOC' : kind.toUpperCase()} cover downloaded.`);
  };
  const field = (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => update(key, event.target.value as never);

  return (
    <div className="mesh-bg min-h-[100dvh]">
      <header className="no-print border-b border-slate-200/80 bg-[#f4f8f8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm"><img src={logoPath} alt="Begum Rokeya University logo" className="h-full w-full object-contain" data-testid="img-brand-logo" /></div><div><p className="font-display text-[15px] font-bold tracking-tight text-[#164a5b]">BRUR Cover Maker</p><p className="hidden text-[11px] text-slate-500 sm:block">Academic stationery, made simple.</p></div></div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#1a9b86]" /> Saved locally</span><button className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700" onClick={copyPrevious} aria-label="Copy previous assignment" data-testid="button-copy-header"><RotateCcw size={17} /></button></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 pb-16 pt-7 sm:px-7 sm:pt-10 lg:px-10">
        <div className="no-print mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div className="max-w-2xl rise-in"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-teal-700"><Sparkles size={13} /> A polished start to every submission</div><h1 className="font-display text-3xl font-bold tracking-[-0.045em] text-[#164a5b] sm:text-4xl lg:text-[46px]">Build a cover page<br /><span className="text-[#1a9b86]">worth submitting.</span></h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Fill in the essentials and preview your BRUR assignment cover as you go. No account, no upload, no fuss.</p></div><div className="no-print flex gap-2"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200" onClick={copyPrevious} data-testid="button-copy-previous"><Clipboard size={15} /> Copy previous</button><div className="relative"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200" onClick={() => setDownloadOpen(!downloadOpen)} data-testid="button-download"><Download size={15} /> Download <ChevronDown size={14} /></button>{downloadOpen && <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-teal-50" onClick={() => download('pdf')} data-testid="button-download-pdf"><FileText size={14} /> PDF document</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-teal-50" onClick={() => download('doc')} data-testid="button-download-doc"><FileText size={14} /> DOC document</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-teal-50" onClick={() => download('txt')} data-testid="button-download-text"><FileText size={14} /> Text document</button></div>}</div><button className="inline-flex items-center gap-2 rounded-xl bg-[#164a5b] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#164a5b]/15 transition hover:-translate-y-0.5 hover:bg-[#1d6074]" onClick={() => window.print()} data-testid="button-print"><Printer size={15} /> Print</button></div></div>
        {notice && <div className="no-print mb-5 flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-800 soft-pop" data-testid="status-notice"><span className="flex items-center gap-2"><Check size={15} /> {notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice" data-testid="button-dismiss-notice"><X size={15} /></button></div>}
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)] xl:gap-10">
          <div className="no-print space-y-5">
            <section className="section-card rise-in" style={{ animationDelay: '.05s' }}><SectionTitle number="01" icon={<GraduationCap size={17} />} title="Course & department" note="Enter the class details for this submission." /><div className="grid gap-4 sm:grid-cols-2"><Field label="Department" value={form.department} onChange={field('department')} placeholder="Optional" testId="input-department" /><Field label="Assignment" value={form.assignment} onChange={field('assignment')} testId="input-assignment" /><Field label="Session" value={form.session} onChange={field('session')} testId="input-session" /><Field label="Course title" value={form.courseTitle} onChange={field('courseTitle')} testId="input-course-title" /><Field label="Course code" value={form.courseCode} onChange={field('courseCode')} testId="input-course-code" /><Field label="Assignment topic" value={form.topic} onChange={field('topic')} placeholder="e.g. A comparative study of sorting algorithms" testId="input-topic" /></div></section>
            <section className="section-card rise-in" style={{ animationDelay: '.1s' }}><SectionTitle number="02" icon={<UserRound size={17} />} title="Submitted to" note="Search a teacher, then edit every detail as needed." /><div className="relative"><span className="field-label">Search teacher name</span><Search className="absolute left-3.5 top-10 text-slate-400" size={16} /><input className="input-shell pl-10" value={teacherQuery} onChange={(event) => setTeacherQuery(event.target.value)} placeholder="Search by name or faculty ID" data-testid="input-teacher-search" />{teacherQuery && <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{filteredTeachers.length ? filteredTeachers.map((teacher) => <button key={teacher.id} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-teal-50" onClick={() => chooseTeacher(teacher)} data-testid={`button-teacher-${teacher.id}`}><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{teacher.id}</span><span><span className="block text-sm font-semibold text-slate-800">{teacher.name}</span><span className="block text-xs text-slate-500">{teacher.designation}</span></span></button>) : <p className="px-3 py-3 text-xs text-slate-500">No teacher match.</p>}</div>}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Teacher name" value={form.teacherName} onChange={field('teacherName')} testId="input-teacher-name" /><Field label="Designation" value={form.teacherDesignation} onChange={field('teacherDesignation')} testId="input-teacher-designation" /><Field label="Department" value={form.teacherDepartment} onChange={field('teacherDepartment')} testId="input-teacher-department" /><Field label="University" value={form.university} onChange={field('university')} testId="input-university" /><Field label="Date of submission" value={form.date} onChange={field('date')} placeholder="DD/MM/YYYY" testId="input-date" /></div></section>
            <section className="section-card rise-in" style={{ animationDelay: '.15s' }}><SectionTitle number="03" icon={<BookOpen size={17} />} title="Submitted by" note="Enter the student details shown on the cover." /><div className="grid gap-4 sm:grid-cols-2"><Field label="Name" value={form.studentName} onChange={field('studentName')} testId="input-student-name" /><Field label="ID" value={form.studentId} onChange={field('studentId')} testId="input-student-id" /><Field label="Registration no." value={form.registrationNo} onChange={field('registrationNo')} testId="input-registration-no" /></div></section>
             <section className="section-card rise-in" style={{ animationDelay: '.2s' }}><SectionTitle number="04" icon={<Users size={17} />} title="Assignment type" note="Individual cover is available now. Group cover is coming soon." /><div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button className="flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs font-bold text-[#164a5b] shadow-sm" onClick={() => update('assignmentType', 'individual')} data-testid="button-individual"><UserRound size={15} /> Individual</button><button className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-400" disabled data-testid="button-group"><Users size={15} /> Group <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Coming Soon</span></button></div></section>
             <section className="section-card rise-in" style={{ animationDelay: '.25s' }}><SectionTitle number="05" icon={<LayoutTemplate size={17} />} title="Choose a finish" note="The simple cover is available now. More styles are coming soon." /><div className="grid gap-3 sm:grid-cols-3">{(['simple', 'professional', 'modern'] as Design[]).map((design) => { const available = design === 'simple'; return <button key={design} onClick={() => available && update('design', design)} disabled={!available} className={`template-option ${form.design === design ? 'template-option-active' : ''} ${!available ? 'cursor-not-allowed opacity-70' : ''}`} data-testid={`button-template-${design}`}><div className={`template-mini mini-${design}`}><span /><span /><span /></div><span className="mt-2 block text-xs font-bold capitalize text-slate-700">{design}</span><span className="mt-0.5 block text-[10px] text-slate-400">{available ? 'Simple A4 cover' : 'Coming Soon'}</span>{form.design === design && <Check className="absolute right-2 top-2 text-teal-600" size={15} />}{!available && <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Coming Soon</span>}</button>; })}</div></section>
            <div className="no-print flex items-center justify-between rounded-2xl border border-[#c7e9e2] bg-[#effaf7] p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm"><Save size={16} /></div><div><p className="text-xs font-bold text-[#164a5b]">Keep your progress</p><p className="text-[11px] text-slate-500">Drafts stay in this browser only.</p></div></div><button className="rounded-xl bg-[#1a8d7f] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#147666]" onClick={saveDraft} data-testid="button-save-draft">{saved && saveLabel === 'Save draft' ? 'Save again' : saveLabel}</button></div>
          </div>
          <aside className="lg:sticky lg:top-6"><div className="no-print mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">Live preview</p><h2 className="font-display text-lg font-bold text-[#164a5b]">Your cover, in focus.</h2></div><div className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">A4 · {form.design}</div></div><div className="preview-frame soft-pop" data-testid="section-preview"><CoverPreview form={form} /></div><div className="no-print mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/75 px-3.5 py-3 text-xs text-slate-500"><Sparkles size={14} className="shrink-0 text-[#e56b51]" /><span>Updates as you type. Print when the details feel right.</span><ArrowRight size={14} className="ml-auto shrink-0 text-slate-300" /></div></aside>
        </div>
      </main>
      <footer className="no-print border-t border-slate-200/70 bg-white/50 px-4 py-6 text-center text-[11px] text-slate-400"><p>Made for BRUR students · Your information never leaves this browser.</p></footer>
    </div>
  );
}

function coverText(form: FormState) {
  const members = form.groupMembers.filter(Boolean);
  return `${form.university || 'BEGUM ROKEYA UNIVERSITY'}\n\n${form.assignment || 'ASSIGNMENT'}\n\n${form.topic || 'Untitled assignment'}\n\nCourse title: ${form.courseTitle}\nCourse code: ${form.courseCode}\nDepartment: ${form.department}\nSession: ${form.session}\n\nSubmitted by:\nName: ${form.studentName}\nID: ${form.studentId}\nRegistration No.: ${form.registrationNo}\n${members.length ? `\nGroup members:\n${members.map((member, index) => `Member ${index + 1}: ${member}`).join('\n')}\n` : ''}\nSubmitted to:\nTeacher name: ${form.teacherName}\nDesignation: ${form.teacherDesignation}\nDepartment: ${form.teacherDepartment}\nUniversity: ${form.university}\nDate of submission: ${form.date}`;
}

const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function replaceDocxText(xml: string, replacements: Array<{ source: string; target: string; all?: boolean }>) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const countOccurrences = (value: string, source: string) => {
    if (!source) return 0;
    let count = 0;
    let from = 0;
    while (true) {
      const index = value.indexOf(source, from);
      if (index < 0) return count;
      count += 1;
      from = index + source.length;
    }
  };
  const replaceOne = (source: string, target: string) => {
    const nodes = Array.from(document.getElementsByTagNameNS(wordNamespace, 't'));
    const fullText = nodes.map((node) => node.textContent ?? '').join('');
    const start = fullText.indexOf(source);
    if (start < 0) return false;
    const end = start + source.length;
    let cursor = 0;
    let startNode = -1;
    let endNode = -1;
    let startOffset = 0;
    let endOffset = 0;
    nodes.forEach((node, index) => {
      const text = node.textContent ?? '';
      if (startNode < 0 && start >= cursor && start <= cursor + text.length) {
        startNode = index;
        startOffset = start - cursor;
      }
      if (endNode < 0 && end >= cursor && end <= cursor + text.length) {
        endNode = index;
        endOffset = end - cursor;
      }
      cursor += text.length;
    });
    if (startNode < 0 || endNode < 0) return false;
    if (startNode === endNode) {
      const text = nodes[startNode].textContent ?? '';
      nodes[startNode].textContent = `${text.slice(0, startOffset)}${target}${text.slice(endOffset)}`;
      return true;
    }
    const firstText = nodes[startNode].textContent ?? '';
    const lastText = nodes[endNode].textContent ?? '';
    nodes[startNode].textContent = `${firstText.slice(0, startOffset)}${target}${lastText.slice(endOffset)}`;
    for (let index = startNode + 1; index <= endNode; index += 1) nodes[index].textContent = '';
    return true;
  };

  replacements.forEach(({ source, target, all }) => {
    const nodes = Array.from(document.getElementsByTagNameNS(wordNamespace, 't'));
    const occurrences = all ? countOccurrences(nodes.map((node) => node.textContent ?? '').join(''), source) : 1;
    for (let index = 0; index < occurrences; index += 1) {
      if (!replaceOne(source, target)) break;
    }
  });
  return new XMLSerializer().serializeToString(document);
}

function setDocxRunFormatting(run: Element, size: string, bold: boolean, color?: string) {
  let properties = run.getElementsByTagNameNS(wordNamespace, 'rPr')[0];
  if (!properties) {
    properties = run.ownerDocument!.createElementNS(wordNamespace, 'w:rPr');
    run.insertBefore(properties, run.firstChild);
  }
  const boldNodes = Array.from(properties.getElementsByTagNameNS(wordNamespace, 'b'));
  const boldCsNodes = Array.from(properties.getElementsByTagNameNS(wordNamespace, 'bCs'));
  [...boldNodes, ...boldCsNodes].forEach((node) => properties.removeChild(node));
  if (bold) {
    properties.appendChild(run.ownerDocument!.createElementNS(wordNamespace, 'w:b'));
  }
  const setValue = (tagName: string, value: string) => {
    let node = properties!.getElementsByTagNameNS(wordNamespace, tagName)[0];
    if (!node) {
      node = run.ownerDocument!.createElementNS(wordNamespace, `w:${tagName}`);
      properties!.appendChild(node);
    }
    node.setAttributeNS(wordNamespace, 'w:val', value);
  };
  setValue('sz', size);
  setValue('szCs', size);
  if (color) {
    let colorNode = properties.getElementsByTagNameNS(wordNamespace, 'color')[0];
    if (!colorNode) {
      colorNode = run.ownerDocument!.createElementNS(wordNamespace, 'w:color');
      properties.appendChild(colorNode);
    }
    colorNode.setAttributeNS(wordNamespace, 'w:val', color);
    colorNode.removeAttributeNS(wordNamespace, 'themeColor');
    colorNode.removeAttributeNS(wordNamespace, 'themeShade');
  }
}

function applySimpleDocxTypography(xml: string, topic: string) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(document.getElementsByTagNameNS(wordNamespace, 'p'));
  paragraphs.forEach((paragraph) => {
    const text = Array.from(paragraph.getElementsByTagNameNS(wordNamespace, 't')).map((node) => node.textContent ?? '').join('').trim();
    if (!text) return;

    const isUniversity = text.includes('Begum Rokeya University');
    const isAssignment = text === 'Assignment';
    const isTopic = Boolean(topic) && (text === topic || text.includes('Assignment on'));
    const isSession = text.startsWith('Session:');
    const isSubmissionLabel = text === 'Submitted by-' || text === 'Submitted to-';
    const size = isUniversity ? '48' : isAssignment ? '36' : isTopic ? '32' : '24';
    const color = isTopic ? '8DB4E2' : undefined;
    const runs = Array.from(paragraph.getElementsByTagNameNS(wordNamespace, 'r'));

    runs.forEach((run) => {
      const runText = Array.from(run.getElementsByTagNameNS(wordNamespace, 't')).map((node) => node.textContent ?? '').join('');
      const runIsSessionLabel = isSession && runText.includes('Session:');
      const bold = isUniversity || isAssignment || isTopic || isSubmissionLabel || runIsSessionLabel;
      setDocxRunFormatting(run, size, bold, color);
    });
  });
  return new XMLSerializer().serializeToString(document);
}

function loadImageDataUrl(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || 512;
      canvas.height = image.naturalHeight || 512;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Unable to prepare the BRUR logo for PDF export.'));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Unable to load the BRUR logo for PDF export.'));
    image.src = source;
  });
}

async function createPdf(form: FormState) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const centerX = 105;
  const left = 25;
  const contentWidth = 160;
  const lineHeight = 5.5;

  // Paint the page first so the exported PDF always has a solid, print-safe background.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, 'F');
  pdf.setFillColor(26, 141, 127);
  pdf.rect(0, 0, 210, 2, 'F');

  try {
    const logoData = await loadImageDataUrl(logoPath);
    pdf.addImage(logoData, 'PNG', 93, 13, 24, 24, undefined, 'FAST');
  } catch {
    // The cover remains usable if a browser blocks the optional logo rasterization.
  }

  const centered = (value: string, y: number, size: number, bold = false, color: [number, number, number] = [17, 17, 17]) => {
    pdf.setFont('times', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(value || '—', contentWidth);
    pdf.text(lines, centerX, y, { align: 'center' });
    return y + Math.max(1, lines.length) * (size * 0.4);
  };

  let y = 48;
  y = centered(form.university || 'Begum Rokeya University, Rangpur', y, 24, true) + 4;
  y = centered(form.department || form.teacherDepartment || 'Department', y, 16) + 10;
  y = centered(form.assignment || 'Assignment', y, 18, true) + 7;
  centered(`Course Code: ${form.courseCode || 'Course code'}`, y, 12);
  y += 6;
  centered(`Course Title: ${form.courseTitle || 'Course title'}`, y, 12);
  y += 6;
  pdf.setFont('times', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(17, 17, 17);
  pdf.text('Session:', centerX - 11, y, { align: 'right' });
  pdf.setFont('times', 'normal');
  pdf.text(form.session || '2024-25', centerX - 9, y);
  y += 10;

  const topicLines = pdf.splitTextToSize(form.topic || 'Assignment topic', 148);
  const topicHeight = Math.max(12, topicLines.length * 7 + 6);
  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(left, y - 6, contentWidth, topicHeight, 2, 2, 'F');
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(37, 99, 235);
  pdf.text(topicLines, centerX, y + 1, { align: 'center' });

  let detailsY = y + topicHeight + 18;
  const drawValue = (value: string, x = left, maxWidth = 150) => {
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(17, 17, 17);
    const lines = pdf.splitTextToSize(value || '—', maxWidth);
    pdf.text(lines, x, detailsY);
    detailsY += Math.max(1, lines.length) * lineHeight;
  };
  const drawLabel = (label: string) => {
    pdf.setFont('times', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(17, 17, 17);
    pdf.text(label, left, detailsY);
    detailsY += lineHeight + 1;
  };

  drawLabel('Submitted by:');
  drawValue(form.studentName || 'Name');
  drawValue(`ID: ${form.studentId || 'ID'}`);
  drawValue(`Registration No.: ${form.registrationNo || 'Registration no'}`);
  detailsY += 6;
  drawLabel('Submitted to:');
  drawValue(form.teacherName || 'Teacher name');
  drawValue(form.teacherDesignation || 'Designation');
  drawValue(form.teacherDepartment || 'Department');
  drawValue(form.university || 'University');

  pdf.setFont('times', 'bold');
  pdf.setFontSize(12);
  pdf.text('Date of submission:', centerX - 3, 278, { align: 'right' });
  pdf.setFont('times', 'normal');
  pdf.text(form.date || today, centerX + 1, 278);
  pdf.setProperties({ title: form.topic || 'BRUR assignment cover', subject: 'A4 assignment cover' });
  return pdf.output('blob');
}

function docxTemplateUrl(form: FormState) {
  if (form.assignmentType === 'group') return groupTemplateUrl;
  return form.design === 'simple' ? simpleTemplateUrl : form.design === 'modern' ? modernTemplateUrl : professionalTemplateUrl;
}

async function createDocx(form: FormState) {
  const response = await fetch(docxTemplateUrl(form));
  if (!response.ok) throw new Error(`Unable to load the ${form.design} DOCX template.`);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('The DOCX template is missing its document body.');
  const templateXml = await documentFile.async('text');
  const members = form.groupMembers.filter(Boolean);
  const replacements = [
    { source: 'Assignment on Bipolar transistor and Field Effect transistor', target: form.topic || 'Assignment topic' },
    { source: 'Electrical and Electronic Engineering', target: form.courseTitle || 'Course title' },
    { source: 'EEE 1211', target: form.courseCode || 'Course code' },
    { source: '2024-25', target: form.session || 'Session' },
    { source: 'Tamima Jannat Lisa', target: form.studentName || 'Name' },
    { source: '12405003', target: form.studentId || 'ID' },
    { source: '000019886', target: form.registrationNo || 'Registration no' },
    { source: 'Md. Faruk Hosen', target: form.teacherName || 'Teacher name' },
    { source: 'Lecturer', target: form.teacherDesignation || 'Designation' },
    { source: 'Department of Computer Science & Engineering', target: form.teacherDepartment || 'Department', all: true },
    { source: 'Department of Computer Science Engineering', target: form.teacherDepartment || 'Department', all: true },
    { source: 'Begum Rokeya University', target: form.university || 'University', all: true },
    { source: '10 September 2026', target: form.date || 'Date of submission' },
    { source: 'Assignment', target: form.assignment || 'Assignment' },
  ].map((replacement) => ({ ...replacement, all: true }));
  if (form.assignmentType === 'group') {
    replacements.push(
      { source: 'Md AL Fahim Fuyad', target: members[0] || '', all: true },
      { source: '2023-1-60-066', target: members[0] ? form.studentId || '' : '', all: true },
      { source: 'Toyabur Rhaman', target: members[1] || '', all: true },
      { source: '2023-1-60-065', target: members[1] ? form.studentId || '' : '', all: true },
      { source: 'Shihab Mahmud Khan', target: members[2] || '', all: true },
      { source: '2023- 1 -60-0 21', target: members[2] ? form.studentId || '' : '', all: true },
      { source: '2023-1-60-021', target: members[2] ? form.studentId || '' : '', all: true },
      { source: 'GROUP: #', target: `GROUP: ${members.length || '#'}`, all: true },
    );
  }
  const replacedXml = replaceDocxText(templateXml, replacements);
  zip.file('word/document.xml', applySimpleDocxTypography(replacedXml, form.topic || 'Assignment topic'));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function coverHtml(form: FormState) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
  const members = form.groupMembers.filter(Boolean);
  const memberMarkup = members.length ? `<p><strong>Group members:</strong><br>${members.map((member, index) => `Member ${index + 1}: ${escape(member)}`).join('<br>')}</p>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(form.topic || 'BRUR assignment cover')}</title><style>@page{size:A4;margin:0}body{font-family:"Times New Roman",Times,serif;color:#111;margin:0}.cover{box-sizing:border-box;width:210mm;min-height:297mm;margin:auto;padding:24mm 25mm;text-align:center;border-top:2mm solid #1a8d7f}.logo{width:24mm;height:24mm;object-fit:contain;margin:0 auto 7mm}.university{font-size:24pt;font-weight:700;margin:0 0 5mm}.department{font-size:16pt;margin:0 0 20mm}.assignment{font-size:18pt;font-weight:700;margin:0 0 12mm}.meta{font-size:12pt;margin:0 0 4mm}.topic{display:inline-block;max-width:170mm;margin:10mm auto 0;padding:3mm 6mm;color:#2563eb;background:#eff6ff;font-size:16pt;font-weight:700}.details{width:160mm;margin:24mm auto 0;text-align:left;font-size:12pt;line-height:1.5}.details p{margin:0 0 8mm}.details strong{font-weight:700}.value{font-weight:400}.date{font-size:12pt;margin-top:12mm;text-align:center}</style></head><body><main class="cover"><img class="logo" src="${logoPath}" alt="BRUR logo"><p class="university">${escape(form.university || 'BEGUM ROKEYA UNIVERSITY')}</p><p class="department">${escape(form.department || form.teacherDepartment || 'Department')}</p><p class="assignment">${escape(form.assignment || 'ASSIGNMENT')}</p><p class="meta"><span>Course Code: </span><span class="value">${escape(form.courseCode)}</span></p><p class="meta"><span>Course Title: </span><span class="value">${escape(form.courseTitle)}</span></p><p class="meta"><strong>Session:</strong> <span class="value">${escape(form.session)}</span></p><p class="topic">${escape(form.topic || 'Untitled assignment')}</p><section class="details"><p><strong>Submitted by:</strong><br><span class="value">${escape(form.studentName)}<br>ID: ${escape(form.studentId)}<br>Registration No.: ${escape(form.registrationNo)}</span></p>${memberMarkup}<p><strong>Submitted to:</strong><br><span class="value">${escape(form.teacherName)}<br>${escape(form.teacherDesignation)}<br>${escape(form.teacherDepartment)}<br>${escape(form.university)}</span></p><p class="date"><strong>Date of submission:</strong> <span class="value">${escape(form.date)}</span></p></section></main></body></html>`;
}

function Router() {
  return <AppShell><ErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></ErrorBoundary></AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;