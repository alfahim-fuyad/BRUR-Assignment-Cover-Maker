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

const queryClient = new QueryClient();

type Design = 'simple' | 'professional' | 'modern';
type AssignmentType = 'individual' | 'group';
type GroupMember = { name: string; id: string };
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
  groupNo: string;
  groupSize: number;
  groupMembers: GroupMember[];
  design: Design;
};

const MAX_MEMBERS = 5;
const DEFAULT_GROUP_NO = '05';

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

// Default date in the DD/MM/YYYY format shown on the cover and the date input placeholder.
const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
const firstTeacher = teachers.find((teacher) => teacher.name === 'Md. Faruk Hosen') ?? teachers[0];
const initialState: FormState = {
  department: '',
  assignment: 'Assignment',
  session: '2024–2025',
  courseTitle: courses[0].title,
  courseCode: courses[0].code,
  topic: 'A thoughtful title for your assignment',
  teacherName: firstTeacher.name,
  teacherDesignation: firstTeacher.designation,
  teacherDepartment: 'Department of Computer Science & Engineering',
  university: 'Begum Rokeya University',
  date: today,
  assignmentType: 'individual',
  studentName: 'Your name',
  studentId: '',
  registrationNo: '',
  groupNo: DEFAULT_GROUP_NO,
  groupSize: 3,
  groupMembers: normalizeMembers([]), // five blank { name, id } slots
  design: 'simple',
};

// Group state helpers: the member list always stores MAX_MEMBERS slots so
// shrinking the member count never loses typed data, and old saved drafts
// that kept plain name strings migrate into { name, id } entries.
function normalizeMembers(raw: unknown): GroupMember[] {
  const source = Array.isArray(raw) ? raw : [];
  return Array.from({ length: MAX_MEMBERS }, (_, index) => {
    const entry = source[index];
    if (typeof entry === 'string') return { name: entry, id: '' };
    const record = (entry ?? {}) as { name?: unknown; id?: unknown };
    return {
      name: typeof record.name === 'string' ? record.name : '',
      id: typeof record.id === 'string' ? record.id : '',
    };
  });
}

function clampGroupSize(value: unknown) {
  const size = Math.round(Number(value));
  return Number.isFinite(size) ? Math.min(MAX_MEMBERS, Math.max(1, size)) : 3;
}

// The member rows shown on the cover: first groupSize slots, with the same
// "Member n / ID" placeholder fallbacks as the reference layout.
function groupRows(form: FormState) {
  if (form.assignmentType !== 'group') return [];
  return form.groupMembers.slice(0, clampGroupSize(form.groupSize)).map((member, index) => ({
    name: member.name.trim() || `Member ${index + 1}`,
    id: member.id.trim() || 'ID',
  }));
}

const groupNoOf = (form: FormState) => form.groupNo.trim() || DEFAULT_GROUP_NO;
const groupLabelOf = (form: FormState) => `Submitted by — GROUP: ${groupNoOf(form)}`;

function readSaved(): FormState | null {
  try {
    const saved = localStorage.getItem('brur-cover-draft');
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<FormState>;
    return {
      ...initialState,
      ...parsed,
      department: parsed.department ?? '',
      groupNo: typeof parsed.groupNo === 'string' ? parsed.groupNo : DEFAULT_GROUP_NO,
      groupSize: clampGroupSize(parsed.groupSize),
      groupMembers: normalizeMembers(parsed.groupMembers),
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
  const group = form.assignmentType === 'group';
  const rows = groupRows(form);
  const groupOn = group ? ' group-on' : '';
  if (form.design === 'professional') return <ProfessionalCover form={form} group={group} rows={rows} />;
  if (form.design === 'modern') return <ModernCover form={form} group={group} rows={rows} />;
  return (
    <div className={`cover-paper docx-cover docx-${form.design}${groupOn} p-7 text-center sm:p-10`}>
      <img className="docx-logo mx-auto object-contain" src={logoPath} alt="BRUR crest" data-testid="img-preview-logo" />
      <p className="docx-university">{form.university || 'Begum Rokeya University'}</p>
      <p className="docx-department">{form.department || form.teacherDepartment || 'Department'}</p>
      <p className="docx-assignment">{form.assignment || 'Assignment'}</p>
      <p className="docx-session"><strong>Session:</strong> {form.session || '2024-25'}</p>
      <p className="docx-course">Course Title: {form.courseTitle || 'Course title'}</p>
      <p className="docx-course">Course Code: {form.courseCode || 'Course code'}</p>
      <p className="docx-topic" data-testid="text-preview-topic">{form.topic || 'Assignment topic'}</p>
      <div className="docx-submission">
        {group ? <>
          <p><strong>Submitted by — GROUP: {groupNoOf(form)}</strong></p>
          <table className="docx-gtable" data-testid="table-group-members">
            <thead><tr><th>Name</th><th>ID</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={`preview-group-${index}`}><td>{row.name}</td><td>{row.id}</td></tr>)}</tbody>
          </table>
        </> : <><p><strong>Submitted by-</strong></p><p>{form.studentName || 'Name'}</p><p><strong>ID:</strong> {form.studentId || 'ID'}</p><p><strong>Registration no:</strong> {form.registrationNo || 'Registration no'}</p></>}
      </div>
      <div className="docx-submitted-to">
        <p><strong>Submitted to-</strong></p>
        <p>{form.teacherName || 'Teacher name'}</p>
        <p>{form.teacherDesignation || 'Designation'}</p>
        <p>{form.teacherDepartment || 'Department'}</p>
        <p>{form.university || 'University'}</p>
      </div>
      <p className="docx-date"><strong>Date of submission:</strong> {form.date || 'Date'}</p>
    </div>
  );
}

// Modern design: bold full-bleed navy banner with a coral accent system, a
// white crest chip, hero topic typography, teal-labeled meta lines and tinted
// "Submitted By / Submitted To" cards. All spacing mirrors createModernPdf()
// so the PDF stays a 1:1 print.
function ModernCover({ form, group, rows }: { form: FormState; group: boolean; rows: Array<{ name: string; id: string }> }) {
  return (
    <div className={`cover-paper docx-cover docx-mc${group ? ' group-on' : ''}`} data-testid="modern-cover">
      <div className="mc-band">
        <span className="mc-strip" aria-hidden="true" />
        <img className="mc-chip-logo" src={logoPath} alt="BRUR crest" data-testid="img-preview-logo" />
        <p className="mc-university">{(form.university || 'Begum Rokeya University').toUpperCase()}</p>
        <p className="mc-department">{form.department || form.teacherDepartment || 'Department'}</p>
      </div>
      <p className="mc-eyebrow">{(form.assignment || 'Assignment').toUpperCase()}</p>
      <p className="mc-topic" data-testid="text-preview-topic">{form.topic || 'Assignment topic'}</p>
      <div className="mc-hero-rule" aria-hidden="true" />
      <p className="mc-meta"><strong>Session:</strong> {form.session || '2024-25'}</p>
      <p className="mc-meta"><strong>Course Title:</strong> {form.courseTitle || 'Course title'}</p>
      <p className="mc-meta"><strong>Course Code:</strong> {form.courseCode || 'Course code'}</p>
      <div className="mc-cards">
        <div className="mc-card mc-card-by">
          <p className="mc-card-label">{group ? `Submitted By — Group: ${groupNoOf(form)}` : 'Submitted By'}</p>
          <div className="mc-card-rule" aria-hidden="true" />
          {group ? <table className="mc-gtable" data-testid="table-group-members">
            <thead><tr><th>Name</th><th>ID</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={`mc-group-${index}`}><td>{row.name}</td><td>{row.id}</td></tr>)}</tbody>
          </table> : <>
            <p className="mc-name">{form.studentName || 'Name'}</p>
            <p className="mc-line"><strong>ID:</strong> {form.studentId || 'ID'}</p>
            <p className="mc-line"><strong>Registration no:</strong> {form.registrationNo || 'Registration no'}</p>
          </>}
        </div>
        <div className="mc-card mc-card-to">
          <p className="mc-card-label">Submitted To</p>
          <div className="mc-card-rule" aria-hidden="true" />
          <p className="mc-name">{form.teacherName || 'Teacher name'}</p>
          <p className="mc-line">{form.teacherDesignation || 'Designation'}</p>
          <p className="mc-line">{form.teacherDepartment || 'Department'}</p>
          <p className="mc-line">{form.university || 'University'}</p>
        </div>
      </div>
      <p className="mc-date"><strong>Date of submission:</strong> {form.date || 'Date'}</p>
    </div>
  );
}

// Professional design: university-standard framed cover with a double rule
// border, gold accents and side-by-side "Submitted by / Submitted to" columns.
// All spacing mirrors createProfessionalPdf() so the PDF stays a 1:1 print.
function ProfessionalCover({ form, group, rows }: { form: FormState; group: boolean; rows: Array<{ name: string; id: string }> }) {
  return (
    <div className={`cover-paper docx-cover docx-professional${group ? ' group-on' : ''} p-7 text-center sm:p-10`}>
      <div className="pc-frame-outer" aria-hidden="true" />
      <div className="pc-frame-inner" aria-hidden="true" />
      <img className="pc-logo mx-auto object-contain" src={logoPath} alt="BRUR crest" data-testid="img-preview-logo" />
      <p className="pc-university">{form.university || 'Begum Rokeya University'}</p>
      <p className="pc-department">{form.department || form.teacherDepartment || 'Department'}</p>
      <div className="pc-rule" aria-hidden="true" />
      <p className="pc-assignment">{(form.assignment || 'Assignment').toUpperCase()}</p>
      <p className="pc-meta pc-session"><strong>Session:</strong> {form.session || '2024-25'}</p>
      <p className="pc-meta"><strong>Course Title:</strong> {form.courseTitle || 'Course title'}</p>
      <p className="pc-meta"><strong>Course Code:</strong> {form.courseCode || 'Course code'}</p>
      <div className="pc-topic" data-testid="text-preview-topic">{form.topic || 'Assignment topic'}</div>
      <div className="pc-columns">
        <div className="pc-col">
          <p className="pc-col-label">{group ? `Submitted By — Group: ${groupNoOf(form)}` : 'Submitted By'}</p>
          <div className="pc-col-rule" aria-hidden="true" />
          {group ? <table className="pc-gtable" data-testid="table-group-members">
            <thead><tr><th>Name</th><th>ID</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={`pc-group-${index}`}><td>{row.name}</td><td>{row.id}</td></tr>)}</tbody>
          </table> : <>
            <p className="pc-name">{form.studentName || 'Name'}</p>
            <p className="pc-line"><strong>ID:</strong> {form.studentId || 'ID'}</p>
            <p className="pc-line"><strong>Registration no:</strong> {form.registrationNo || 'Registration no'}</p>
          </>}
        </div>
        <div className="pc-col">
          <p className="pc-col-label">Submitted To</p>
          <div className="pc-col-rule" aria-hidden="true" />
          <p className="pc-name">{form.teacherName || 'Teacher name'}</p>
          <p className="pc-line">{form.teacherDesignation || 'Designation'}</p>
          <p className="pc-line">{form.teacherDepartment || 'Department'}</p>
          <p className="pc-line">{form.university || 'University'}</p>
        </div>
      </div>
      <p className="pc-date"><strong>Date of submission:</strong> {form.date || 'Date'}</p>
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
    // Every finish is unlocked now, so a saved professional or modern draft is honoured.
    return savedForm ? { ...savedForm, design: savedForm.design === 'professional' || savedForm.design === 'modern' ? savedForm.design : 'simple', assignmentType: savedForm.assignmentType === 'group' ? 'group' : 'individual' } : initialState;
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
  const updateMember = (index: number, key: 'name' | 'id', value: string) => setForm((current) => ({ ...current, groupMembers: current.groupMembers.map((member, memberIndex) => memberIndex === index ? { ...member, [key]: value } : member) }));
  const download = async (kind: 'pdf' | 'txt' | 'doc') => {
    const title = form.topic || 'BRUR-assignment-cover';
    const cleanTitle = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const blob = kind === 'pdf'
      ? await (form.design === 'professional' ? createProfessionalPdf(form) : form.design === 'modern' ? createModernPdf(form) : createPdf(form))
      : kind === 'doc'
        ? await createDocx(form)
        : new Blob([coverText(form)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // The PDF cover must always be saved as mihaF.pdf; other formats keep the topic-based name.
    link.download = kind === 'pdf' ? 'mihaF.pdf' : `${cleanTitle || 'brur-cover'}.${kind === 'doc' ? 'docx' : kind}`;
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
            <section className="section-card rise-in" style={{ animationDelay: '.1s' }}><SectionTitle number="02" icon={<UserRound size={17} />} title="Submitted to" note="Search a teacher, then edit every detail as needed." /><div><span className="field-label">Search teacher name</span><div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className="input-shell input-with-icon" value={teacherQuery} onChange={(event) => setTeacherQuery(event.target.value)} placeholder="Search by name or faculty ID" data-testid="input-teacher-search" />{teacherQuery && <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{filteredTeachers.length ? filteredTeachers.map((teacher) => <button key={teacher.id} className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-teal-50" onClick={() => chooseTeacher(teacher)} data-testid={`button-teacher-${teacher.id}`}><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{teacher.id}</span><span><span className="block text-sm font-semibold text-slate-800">{teacher.name}</span><span className="block text-xs text-slate-500">{teacher.designation}</span></span></button>) : <p className="px-3 py-3 text-xs text-slate-500">No teacher match.</p>}</div>}</div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Teacher name" value={form.teacherName} onChange={field('teacherName')} testId="input-teacher-name" /><Field label="Designation" value={form.teacherDesignation} onChange={field('teacherDesignation')} testId="input-teacher-designation" /><Field label="Department" value={form.teacherDepartment} onChange={field('teacherDepartment')} testId="input-teacher-department" /><Field label="University" value={form.university} onChange={field('university')} testId="input-university" /><Field label="Date of submission" value={form.date} onChange={field('date')} placeholder="DD/MM/YYYY" testId="input-date" /></div></section>
            <section className="section-card rise-in" style={{ animationDelay: '.15s' }}><SectionTitle number="03" icon={<BookOpen size={17} />} title="Submitted by" note="Enter the student details shown on the cover." />{form.assignmentType === 'group' ? <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3.5 text-xs font-semibold leading-5 text-teal-800">Group submission is on — the member Name / ID table is edited in Step 04 below, and the individual fields are hidden while group mode is active.</div> : <div className="grid gap-4 sm:grid-cols-2"><Field label="Name" value={form.studentName} onChange={field('studentName')} testId="input-student-name" /><Field label="ID" value={form.studentId} onChange={field('studentId')} testId="input-student-id" /><Field label="Registration no." value={form.registrationNo} onChange={field('registrationNo')} testId="input-registration-no" /></div>}</section>
             <section className="section-card rise-in" style={{ animationDelay: '.2s' }}><SectionTitle number="04" icon={<Users size={17} />} title="Assignment type" note="Individual or group (up to 5 members) — the cover adapts instantly." /><div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1"><button className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold ${form.assignmentType === 'individual' ? 'bg-white text-[#164a5b] shadow-sm' : 'text-slate-500'}`} onClick={() => update('assignmentType', 'individual')} data-testid="button-individual"><UserRound size={15} /> Individual</button><button className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold ${form.assignmentType === 'group' ? 'bg-white text-[#164a5b] shadow-sm' : 'text-slate-500'}`} onClick={() => update('assignmentType', 'group')} data-testid="button-group"><Users size={15} /> Group</button></div>{form.assignmentType === 'group' && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Group number" value={form.groupNo} onChange={field('groupNo')} placeholder="e.g. 05" testId="input-group-no" /><label><span className="field-label">Number of members (max 5)</span><input className="input-shell" type="number" min={1} max={5} step={1} value={form.groupSize} onChange={(event) => update('groupSize', clampGroupSize(event.target.value))} data-testid="input-group-size" /></label></div><div className="space-y-3">{Array.from({ length: form.groupSize }, (_, index) => <div key={`member-slot-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Member {index + 1}</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Name" value={form.groupMembers[index]?.name ?? ''} onChange={(event) => updateMember(index, 'name', event.target.value)} placeholder={`Member ${index + 1} name`} testId={`input-member-name-${index}`} /><Field label="ID" value={form.groupMembers[index]?.id ?? ''} onChange={(event) => updateMember(index, 'id', event.target.value)} placeholder={`Member ${index + 1} ID`} testId={`input-member-id-${index}`} /></div></div>)}</div></div>}</section>
             <section className="section-card rise-in" style={{ animationDelay: '.25s' }}><SectionTitle number="05" icon={<LayoutTemplate size={17} />} title="Choose a finish" note="Simple, professional and modern covers are all ready." /><div className="grid gap-3 sm:grid-cols-3">{(['simple', 'professional', 'modern'] as Design[]).map((design) => <button key={design} onClick={() => update('design', design)} className={`template-option ${form.design === design ? 'template-option-active' : ''}`} data-testid={`button-template-${design}`}><div className={`template-mini mini-${design}`}><span /><span /><span /></div><span className="mt-2 block text-xs font-bold capitalize text-slate-700">{design}</span><span className="mt-0.5 block text-[10px] text-slate-400">{design === 'simple' ? 'Simple A4 cover' : design === 'professional' ? 'Framed two-column cover' : 'Bold banner cover'}</span>{form.design === design && <Check className="absolute right-2 top-2 text-teal-600" size={15} />}</button>)}</div></section>
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
  const rows = groupRows(form);
  const nameWidth = Math.max(4, ...rows.map((row) => row.name.length));
  const groupTable = rows.length ? `\nSubmitted by — GROUP: ${groupNoOf(form)}\n\n${`Name${' '.repeat(nameWidth - 4)}  ID\n${rows.map((row) => `${row.name.padEnd(nameWidth)}  ${row.id}`).join('\n')}`}\n` : '';
  return `${form.university || 'BEGUM ROKEYA UNIVERSITY'}\n\n${form.assignment || 'ASSIGNMENT'}\n\n${form.topic || 'Untitled assignment'}\n\nCourse title: ${form.courseTitle}\nCourse code: ${form.courseCode}\nDepartment: ${form.department}\nSession: ${form.session}\n\n${form.assignmentType === 'group' ? groupTable : `Submitted by-\n${form.studentName}\nID: ${form.studentId}\nRegistration no: ${form.registrationNo}\n`}\nSubmitted to-\n${form.teacherName}\n${form.teacherDesignation}\n${form.teacherDepartment}\n${form.university}\nDate of submission: ${form.date}`;
}

// ---------------------------------------------------------------------------
// DOC export — the .docx is generated from scratch for the chosen design
// (simple / professional / modern), mirroring the live preview and its PDF,
// so it always opens as a clean, correctly formatted A4 cover page instead of
// a mangled patch of the old binary templates.
// Units: OOXML lengths are twips (1/1440"), font sizes are half-points, letter
// spacing is twentieths of a point. The preview sheet is 520 CSS px mapped
// onto A4 (1px = 0.403846mm), which yields the factors below.
// ---------------------------------------------------------------------------
const DOCX_TW_PER_PX = (210 / 520) * 56.6929;
const DOCX_EMU_PER_PX = (210 / 520) * 36000;
const DOCX_HALF_POINTS_PER_PX = 2.28954; // 1px = 1.14477pt
const DOCX_CHAR_SPACE_PER_EM = 22.8954; // 1em of tracking, in 1/20 pt
const DOCX_LOGO_REL = 'rId2';

const DOCX_INK = '111111';
const DOCX_NAVY = '164A5B';
const DOCX_GOLD = 'B9973F';
const DOCX_SOFT = '374151';
const DOCX_TOPIC_INK = '2563EB';
const DOCX_TOPIC_BG = 'EFF6FF';
const DOCX_MIST = 'CFE3EA';
const DOCX_WHITE = 'FFFFFF';
const DOCX_CORAL = 'E56B51';
const DOCX_TEAL = '1A8D7F';
const DOCX_TEAL_RULE = '1A9B86';
const DOCX_BY_LABEL = '147A6E';
const DOCX_TO_LABEL = 'C94F30';
const DOCX_HERO = '0F3A47';
const DOCX_CARD_BG = 'F4FAF9';
const DOCX_BAND_BG = 'F8FBFC';

const DOCX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;

const DOCX_ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

const DOCX_DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="${DOCX_LOGO_REL}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/></Relationships>`;

const DOCX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:color w:val="${DOCX_INK}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;

const DOCX_APP_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>BRUR Cover Maker</Application></Properties>`;

function escXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type DocxSeg = { text: string; bold?: boolean; color?: string; sz?: number; charSpace?: number };
type DocxPara = {
  segs?: DocxSeg[];
  drawing?: { px: number; relId: string; id: number };
  sz?: number;
  bold?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right';
  before?: number;
  after?: number;
  line?: number; // exact line height in twips — used for solid colour bars / spacers
  indLeft?: number;
  indRight?: number;
  shd?: string;
  charSpace?: number;
};

function dseg(text: string, extra: Partial<DocxSeg> = {}): DocxSeg {
  return { text, ...extra };
}

function docxRunXml(run: DocxSeg, base: { sz: number; bold?: boolean; color?: string; charSpace?: number }) {
  const sz = Math.round(run.sz ?? base.sz);
  const bold = run.bold ?? base.bold ?? false;
  const color = run.color ?? base.color;
  const charSpace = run.charSpace ?? base.charSpace;
  let rpr = '<w:rPr>';
  if (bold) rpr += '<w:b/><w:bCs/>';
  if (color) rpr += `<w:color w:val="${color}"/>`;
  if (charSpace) rpr += `<w:spacing w:val="${Math.round(charSpace)}"/>`;
  rpr += `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`;
  return `<w:r>${rpr}<w:t xml:space="preserve">${escXml(run.text)}</w:t></w:r>`;
}

function docxParaXml(para: DocxPara) {
  let ppr = '';
  if (para.shd) ppr += `<w:shd w:val="clear" w:color="auto" w:fill="${para.shd}"/>`;
  const spacing = `<w:spacing w:before="${Math.round(para.before ?? 0)}" w:after="${Math.round(para.after ?? 0)}"${para.line ? ` w:line="${Math.round(para.line)}" w:lineRule="exact"` : ''}/>`;
  ppr += spacing;
  if (para.indLeft || para.indRight) ppr += `<w:ind${para.indLeft ? ` w:left="${Math.round(para.indLeft)}"` : ''}${para.indRight ? ` w:right="${Math.round(para.indRight)}"` : ''}/>`;
  ppr += `<w:jc w:val="${para.align ?? 'left'}"/>`;
  const markSize = Math.round(para.line ? 2 : (para.sz ?? 24));
  ppr += `<w:rPr><w:sz w:val="${markSize}"/><w:szCs w:val="${markSize}"/></w:rPr>`;
  let body = '';
  if (para.drawing) body += docxDrawingXml(para.drawing.px, para.drawing.relId, para.drawing.id);
  if (para.segs?.length) {
    body += para.segs.map((run) => docxRunXml(run, { sz: para.sz ?? 24, bold: para.bold, color: para.color, charSpace: para.charSpace })).join('');
  }
  return `<w:p><w:pPr>${ppr}</w:pPr>${body}</w:p>`;
}

function docxDrawingXml(px: number, relId: string, id: number) {
  const emu = Math.round(px * DOCX_EMU_PER_PX);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu}" cy="${emu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="BRUR crest"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="BRUR crest"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu}" cy="${emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

// Solid colour bar (gold rules, coral strips, spacers) as an exact-height paragraph.
function docxBarXml(lineTw: number, before: number, fill: string | undefined, indLeft = 0, indRight = 0) {
  return docxParaXml({ line: lineTw, before, shd: fill, indLeft: indLeft || undefined, indRight: indRight || undefined });
}

type DocxCellMargin = { top?: number; bottom?: number; left?: number; right?: number };

function docxCellXml(paras: string[], opts: { width: number; shd?: string; margin?: DocxCellMargin; borderTop?: number; borderBottom?: number; borderColor?: string }) {
  let tcpr = `<w:tcW w:w="${opts.width}" w:type="dxa"/>`;
  if (opts.borderTop || opts.borderBottom) {
    const color = opts.borderColor ?? 'auto';
    tcpr += `<w:tcBorders>${opts.borderTop ? `<w:top w:val="single" w:sz="${opts.borderTop}" w:space="0" w:color="${color}"/>` : '<w:top w:val="nil"/>'}${opts.borderBottom ? `<w:bottom w:val="single" w:sz="${opts.borderBottom}" w:space="0" w:color="${color}"/>` : '<w:bottom w:val="nil"/>'}</w:tcBorders>`;
  }
  if (opts.shd) tcpr += `<w:shd w:val="clear" w:color="auto" w:fill="${opts.shd}"/>`;
  if (opts.margin) {
    const m = opts.margin;
    tcpr += `<w:tcMar>${m.top ? `<w:top w:w="${m.top}" w:type="dxa"/>` : ''}${m.left ? `<w:left w:w="${m.left}" w:type="dxa"/>` : ''}${m.bottom ? `<w:bottom w:w="${m.bottom}" w:type="dxa"/>` : ''}${m.right ? `<w:right w:w="${m.right}" w:type="dxa"/>` : ''}</w:tcMar>`;
  }
  return `<w:tc><w:tcPr>${tcpr}</w:tcPr>${paras.join('')}</w:tc>`;
}

function docxSpacerCellXml(width: number) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p></w:tc>`;
}

function docxTableXml(width: number, cols: number[], cells: string[]) {
  const grid = cols.map((c) => `<w:gridCol w:w="${c}"/>`).join('');
  const nil = (edge: string) => `<w:${edge} w:val="none" w:sz="0" w:space="0" w:color="auto"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${nil('top')}${nil('left')}${nil('bottom')}${nil('right')}${nil('insideH')}${nil('insideV')}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid><w:tr>${cells.join('')}</w:tr></w:tbl>`;
}

function docxSectXml(margin: number, pageBorder: boolean) {
  const borders = pageBorder ? `<w:pgBorders w:offsetFrom="page"><w:top w:val="double" w:sz="6" w:space="16" w:color="${DOCX_NAVY}"/><w:left w:val="double" w:sz="6" w:space="16" w:color="${DOCX_NAVY}"/><w:bottom w:val="double" w:sz="6" w:space="16" w:color="${DOCX_NAVY}"/><w:right w:val="double" w:sz="6" w:space="16" w:color="${DOCX_NAVY}"/></w:pgBorders>` : '';
  return `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="0" w:footer="0" w:gutter="0"/>${borders}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
}

function docxValues(form: FormState) {
  return {
    university: form.university || 'Begum Rokeya University',
    department: form.department || form.teacherDepartment || 'Department',
    assignment: form.assignment || 'Assignment',
    session: form.session || '2024-25',
    courseTitle: form.courseTitle || 'Course title',
    courseCode: form.courseCode || 'Course code',
    topic: form.topic || 'Assignment topic',
    studentName: form.studentName || 'Name',
    studentId: form.studentId || 'ID',
    registrationNo: form.registrationNo || 'Registration no',
    teacherName: form.teacherName || 'Teacher name',
    teacherDesignation: form.teacherDesignation || 'Designation',
    teacherDepartment: form.teacherDepartment || 'Department',
    date: form.date || 'Date',
    members: groupRows(form),
    groupNo: groupNoOf(form),
    group: form.assignmentType === 'group',
  };
}

// Bordered two-column Name/ID member table for group mode (grid borders,
// tinted header row, fixed layout). Used directly or nested inside a cell.
function docxGridTableXml(opts: { width: number; cols: number[]; header: string[]; rows: Array<Array<string>>; borderColor: string; headerFill?: string; headerColor?: string; sz?: number }) {
  const edge = (name: string) => `<w:${name} w:val="single" w:sz="4" w:space="0" w:color="${opts.borderColor}"/>`;
  const cell = (text: string, width: number, isHeader: boolean) => docxCellXml(
    [docxParaXml({ segs: [dseg(text, { bold: isHeader, color: isHeader ? opts.headerColor : undefined })], sz: opts.sz ?? 22 })],
    { width, shd: isHeader ? opts.headerFill : undefined, margin: { top: 46, bottom: 46, left: 115, right: 115 } },
  );
  const headRow = `<w:tr>${opts.header.map((text, index) => cell(text, opts.cols[index], true)).join('')}</w:tr>`;
  const bodyRows = opts.rows.map((row) => `<w:tr>${row.map((text, index) => cell(text, opts.cols[index], false)).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${opts.width}" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>${edge('top')}${edge('left')}${edge('bottom')}${edge('right')}${edge('insideH')}${edge('insideV')}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${opts.cols.map((c) => `<w:gridCol w:w="${c}"/>`).join('')}</w:tblGrid>${headRow}${bodyRows}</w:tbl>`;
}

// Simple finish — centered Times layout mirroring the .docx-* preview styles.
function simpleDocxBody(form: FormState): string {
  const v = docxValues(form);
  const indent = 806; // 84% block centred in the 440px content box
  const ps = [
    docxParaXml({ drawing: { px: 62, relId: DOCX_LOGO_REL, id: 1 }, align: 'center', before: 201 }),
    docxParaXml({ segs: [dseg(v.university, { bold: true })], sz: 48, align: 'center', before: 302 }),
    docxParaXml({ segs: [dseg(v.department)], sz: 32, align: 'center', before: 151 }),
    docxParaXml({ segs: [dseg(v.assignment, { bold: true })], sz: 37, align: 'center', before: 1007 }),
    docxParaXml({ segs: [dseg('Session:', { bold: true }), dseg(` ${v.session}`)], sz: 25, align: 'center', before: 353 }),
    docxParaXml({ segs: [dseg(`Course Title: ${v.courseTitle}`)], sz: 25, align: 'center', before: 353 }),
    docxParaXml({ segs: [dseg(`Course Code: ${v.courseCode}`)], sz: 25, align: 'center', before: 353, after: 907 }),
    docxTableXml(8461, [8461], [docxCellXml([docxParaXml({ segs: [dseg(v.topic, { bold: true })], sz: 32, color: DOCX_TOPIC_INK, align: 'center' })], { width: 8461, shd: DOCX_TOPIC_BG, margin: { top: 151, bottom: 151, left: 302, right: 302 } })]),
    docxBarXml(806, 0, undefined), // gap below the topic pill
  ];
  if (v.group) {
    ps.push(docxParaXml({ segs: [dseg(`Submitted by — GROUP: ${v.groupNo}`, { bold: true })], sz: 25, indLeft: indent, indRight: indent }));
    ps.push(docxGridTableXml({ width: 8461, cols: [5077, 3384], header: ['Name', 'ID'], rows: v.members.map((row) => [row.name, row.id]), borderColor: 'C7D4DC', headerFill: 'F1F6F9', sz: 25 }));
  } else {
    ps.push(docxParaXml({ segs: [dseg('Submitted by-', { bold: true })], sz: 25, indLeft: indent, indRight: indent }));
    ps.push(docxParaXml({ segs: [dseg(v.studentName)], sz: 25, indLeft: indent, indRight: indent }));
    ps.push(docxParaXml({ segs: [dseg('ID:', { bold: true }), dseg(` ${v.studentId}`)], sz: 25, indLeft: indent, indRight: indent }));
    ps.push(docxParaXml({ segs: [dseg('Registration no:', { bold: true }), dseg(` ${v.registrationNo}`)], sz: 25, indLeft: indent, indRight: indent }));
  }
  ps.push(docxParaXml({ segs: [dseg('Submitted to-', { bold: true })], sz: 25, before: v.group ? 403 : 806, indLeft: indent, indRight: indent }));
  ps.push(docxParaXml({ segs: [dseg(v.teacherName)], sz: 25, indLeft: indent, indRight: indent }));
  ps.push(docxParaXml({ segs: [dseg(v.teacherDesignation)], sz: 25, indLeft: indent, indRight: indent }));
  ps.push(docxParaXml({ segs: [dseg(v.teacherDepartment)], sz: 25, indLeft: indent, indRight: indent }));
  ps.push(docxParaXml({ segs: [dseg(v.university)], sz: 25, indLeft: indent, indRight: indent }));
  ps.push(docxParaXml({ segs: [dseg('Date of submission:', { bold: true }), dseg(` ${v.date}`)], sz: 30, align: 'center', before: v.group ? 201 : 1209 }));
  return ps.join('');
}

// Professional finish — navy/gold framed cover with two Submitted By / To columns.
function professionalDocxBody(form: FormState): string {
  const v = docxValues(form);
  const colWidth = 3961;
  const ruleIndent = colWidth - 687; // 30px gold rule at the left edge of the cell
  const label = (text: string) => docxParaXml({ segs: [dseg(text, { bold: true, color: DOCX_NAVY, charSpace: 32 })], sz: 23 });
  const goldRule = () => docxBarXml(37, 69, DOCX_GOLD, 0, ruleIndent);
  const byParas = [label(v.group ? `Submitted By — Group: ${v.groupNo}` : 'Submitted By'), goldRule()];
  if (v.group) {
    byParas.push(docxGridTableXml({ width: 3800, cols: [2280, 1520], header: ['Name', 'ID'], rows: v.members.map((row) => [row.name, row.id]), borderColor: 'B9CDD5', headerFill: 'F8FBFC', headerColor: DOCX_NAVY, sz: 22 }));
    byParas.push(docxParaXml({ sz: 2 })); // OOXML requires a paragraph after a nested table
  } else {
    byParas.push(docxParaXml({ segs: [dseg(v.studentName, { bold: true })], sz: 26, before: 183 }));
    byParas.push(docxParaXml({ segs: [dseg('ID:', { bold: true, color: DOCX_NAVY }), dseg(` ${v.studentId}`)], sz: 24, before: 92 }));
    byParas.push(docxParaXml({ segs: [dseg('Registration no:', { bold: true, color: DOCX_NAVY }), dseg(` ${v.registrationNo}`)], sz: 24, before: 92 }));
  }
  const toParas = [
    label('SUBMITTED TO'),
    goldRule(),
    docxParaXml({ segs: [dseg(v.teacherName, { bold: true })], sz: 26, before: 183 }),
    docxParaXml({ segs: [dseg(v.teacherDesignation)], sz: 24, before: 92 }),
    docxParaXml({ segs: [dseg(v.teacherDepartment)], sz: 24, before: 92 }),
    docxParaXml({ segs: [dseg(v.university)], sz: 24, before: 92 }),
  ];
  const ps = [
    docxParaXml({ drawing: { px: 64, relId: DOCX_LOGO_REL, id: 1 }, align: 'center' }),
    docxParaXml({ segs: [dseg(v.university.toUpperCase(), { bold: true, color: DOCX_NAVY })], sz: 46, align: 'center', before: 353 }),
    docxParaXml({ segs: [dseg(v.department, { color: DOCX_SOFT })], sz: 29, align: 'center', before: 121 }),
    docxBarXml(50, 242, DOCX_GOLD, 4533, 4533), // centred 44px gold divider
    docxParaXml({ segs: [dseg(v.assignment.toUpperCase(), { bold: true, color: DOCX_NAVY, charSpace: 54 })], sz: 34, align: 'center', before: 756 }),
    docxParaXml({ segs: [dseg('Session:', { bold: true, color: DOCX_NAVY }), dseg(` ${v.session}`)], sz: 25, align: 'center', before: 443 }),
    docxParaXml({ segs: [dseg('Course Title:', { bold: true, color: DOCX_NAVY }), dseg(` ${v.courseTitle}`)], sz: 25, align: 'center', before: 181 }),
    docxParaXml({ segs: [dseg('Course Code:', { bold: true, color: DOCX_NAVY }), dseg(` ${v.courseCode}`)], sz: 25, align: 'center', before: 181, after: 907 }),
    docxTableXml(8461, [8461], [docxCellXml([docxParaXml({ segs: [dseg(v.topic, { bold: true, color: DOCX_NAVY })], sz: 32, align: 'center' })], { width: 8461, shd: DOCX_BAND_BG, borderTop: 20, borderBottom: 20, borderColor: DOCX_NAVY, margin: { top: 222, bottom: 222, left: 302, right: 302 } })]),
    docxBarXml(1007, 0, undefined), // gap between the topic band and the columns
    docxTableXml(8461, [colWidth, 539, colWidth], [docxCellXml(byParas, { width: colWidth }), docxSpacerCellXml(539), docxCellXml(toParas, { width: colWidth })]),
    docxBarXml(v.group ? 2015 : 3022, 0, undefined), // push the date toward the bottom like .pc-date
    docxParaXml({ segs: [dseg('Date of submission:', { bold: true, color: DOCX_NAVY }), dseg(` ${v.date}`)], sz: 29, align: 'center' }),
  ];
  return ps.join('');
}

// Modern finish — full-bleed navy banner, coral accents and tinted info cards.
function modernDocxBody(form: FormState): string {
  const v = docxValues(form);
  const cardWidth = 5055;
  const cardPadding = 320;
  const ruleIndent = cardWidth - 2 * cardPadding - 549; // 24px accent rule in the card
  const meta = (label: string, value: string, before: number, extra: Partial<DocxPara> = {}) => docxParaXml({ segs: [dseg(`${label}:`, { bold: true, color: DOCX_TEAL }), dseg(` ${value}`, { color: DOCX_SOFT })], sz: 26, align: 'center', before, ...extra });
  const byParas = [docxParaXml({ segs: [dseg(v.group ? `Submitted By — Group: ${v.groupNo}` : 'SUBMITTED BY', { bold: true, color: DOCX_BY_LABEL, charSpace: 34 })], sz: 22 }), docxBarXml(69, 114, DOCX_TEAL_RULE, 0, ruleIndent)];
  if (v.group) {
    byParas.push(docxGridTableXml({ width: 4400, cols: [2640, 1760], header: ['Name', 'ID'], rows: v.members.map((row) => [row.name, row.id]), borderColor: 'CFE2DC', headerFill: 'EAF5F2', headerColor: DOCX_BY_LABEL, sz: 23 }));
    byParas.push(docxParaXml({ sz: 2 })); // OOXML requires a paragraph after a nested table
  } else {
    byParas.push(docxParaXml({ segs: [dseg(v.studentName, { bold: true, color: DOCX_INK })], sz: 26, before: 206 }));
    byParas.push(docxParaXml({ segs: [dseg('ID:', { bold: true, color: DOCX_HERO }), dseg(` ${v.studentId}`, { color: DOCX_SOFT })], sz: 24, before: 114 }));
    byParas.push(docxParaXml({ segs: [dseg('Registration no:', { bold: true, color: DOCX_HERO }), dseg(` ${v.registrationNo}`, { color: DOCX_SOFT })], sz: 24, before: 114 }));
  }
  const toParas = [
    docxParaXml({ segs: [dseg('SUBMITTED TO', { bold: true, color: DOCX_TO_LABEL, charSpace: 34 })], sz: 22 }),
    docxBarXml(69, 114, DOCX_CORAL, 0, ruleIndent),
    docxParaXml({ segs: [dseg(v.teacherName, { bold: true, color: DOCX_INK })], sz: 26, before: 206 }),
    docxParaXml({ segs: [dseg(v.teacherDesignation, { color: DOCX_SOFT })], sz: 24, before: 114 }),
    docxParaXml({ segs: [dseg(v.teacherDepartment, { color: DOCX_SOFT })], sz: 24, before: 114 }),
    docxParaXml({ segs: [dseg(v.university, { color: DOCX_SOFT })], sz: 24, before: 114 }),
  ];
  const cardCell = (paras: string[]) => docxCellXml(paras, { width: cardWidth, shd: DOCX_CARD_BG, margin: { top: cardPadding, bottom: cardPadding, left: cardPadding, right: cardPadding } });
  const ps = [
    docxBarXml(824, 0, DOCX_NAVY), // banner top padding
    docxParaXml({ drawing: { px: 64, relId: DOCX_LOGO_REL, id: 1 }, align: 'center', shd: DOCX_NAVY }),
    docxParaXml({ segs: [dseg(v.university.toUpperCase(), { bold: true, color: DOCX_WHITE, charSpace: 36 })], sz: 46, align: 'center', before: 320, shd: DOCX_NAVY }),
    docxParaXml({ segs: [dseg(v.department, { color: DOCX_MIST })], sz: 29, align: 'center', before: 160, shd: DOCX_NAVY }),
    docxBarXml(855, 0, DOCX_NAVY), // banner bottom padding
    docxBarXml(92, 0, DOCX_CORAL), // 4px coral strip
    docxParaXml({ segs: [dseg(v.assignment.toUpperCase(), { bold: true, color: DOCX_CORAL, charSpace: 60 })], sz: 25, align: 'center', before: 687 }),
    docxParaXml({ segs: [dseg(v.topic, { bold: true, color: DOCX_HERO })], sz: 50, align: 'center', before: 275, indLeft: 715, indRight: 715 }),
    docxBarXml(92, 320, DOCX_CORAL, 5312, 5312), // 56px coral underline
    meta('Session', v.session, 458),
    meta('Course Title', v.courseTitle, 160),
    meta('Course Code', v.courseCode, 160, { after: 595 }),
    docxTableXml(10477, [cardWidth, 366, cardWidth], [cardCell(byParas), docxSpacerCellXml(366), cardCell(toParas)]),
    docxBarXml(v.group ? 1603 : 2976, 0, undefined), // .mc-date gap
    docxParaXml({ segs: [dseg('Date of submission:', { bold: true, color: DOCX_TEAL }), dseg(` ${v.date}`)], sz: 27, align: 'center' }),
  ];
  return ps.join('');
}

function buildDocxDocument(form: FormState): string {
  const body = form.design === 'professional' ? professionalDocxBody(form) : form.design === 'modern' ? modernDocxBody(form) : simpleDocxBody(form);
  const margin = form.design === 'modern' ? 0 : 917; // 40px preview padding, 0 for the full-bleed banner
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}${docxSectXml(margin, form.design === 'professional')}</w:body></w:document>`;
}

function docxCoreProps(form: FormState): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escXml(form.topic || 'BRUR assignment cover')}</dc:title><dc:creator>BRUR Cover Maker</dc:creator><cp:lastModifiedBy>BRUR Cover Maker</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00.000Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00.000Z</dcterms:modified></cp:coreProperties>`;
}

async function createDocx(form: FormState) {
  const logoDataUrl = await loadImageDataUrl(logoPath);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', DOCX_CONTENT_TYPES);
  zip.file('_rels/.rels', DOCX_ROOT_RELS);
  zip.file('docProps/core.xml', docxCoreProps(form));
  zip.file('docProps/app.xml', DOCX_APP_PROPS);
  zip.file('word/document.xml', buildDocxDocument(form));
  zip.file('word/_rels/document.xml.rels', DOCX_DOCUMENT_RELS);
  zip.file('word/styles.xml', DOCX_STYLES);
  zip.file('word/media/image1.png', logoDataUrl.slice(logoDataUrl.indexOf(',') + 1), { base64: true });
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}
function loadImageDataUrl(source: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Rasterize into a square canvas at print quality; the SVG's preserveAspectRatio
      // letterboxes the crest exactly like object-contain does inside the preview box.
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Unable to prepare the BRUR logo for PDF export.'));
        return;
      }
      context.drawImage(image, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => reject(new Error('Unable to load the BRUR logo for PDF export.'));
    image.src = source;
  });
}

// Every metric below is derived from the live preview (.cover-paper) so the exported PDF
// is a 1:1 print of the design the student sees on screen. The preview paper is 520 CSS px
// wide and is mapped onto an A4 page (210mm x 297mm); preview px -> mm scale = 210 / 520.
const PDF_MM_PER_PX = 210 / 520;
const PDF_LINE_HEIGHT = 1.15; // .docx-cover line-height
// Baseline offset inside a CSS line box for Times (ascent 0.891em + half-leading 0.0215em).
const PDF_BASELINE = 0.9125;
const PDF_INK: [number, number, number] = [17, 17, 17]; // #111111
const PDF_TOPIC_INK: [number, number, number] = [37, 99, 235]; // #2563eb
const PDF_TOPIC_BG: [number, number, number] = [239, 246, 255]; // #eff6ff
// Professional design palette (mirrors the .pc-* styles in index.css).
const PDF_NAVY: [number, number, number] = [22, 74, 91]; // #164a5b — frame, headings, labels
const PDF_GOLD: [number, number, number] = [185, 151, 63]; // #b9973f — accent rules
const PDF_SOFT: [number, number, number] = [55, 65, 81]; // #374151 — secondary ink
const PDF_HAIR: [number, number, number] = [157, 184, 194]; // #9db8c2 — inner hairline
const PDF_BAND: [number, number, number] = [248, 251, 252]; // #f8fbfc — topic band fill

// Modern design palette (mirrors the .mc-* styles in index.css).
const PDF_WHITE: [number, number, number] = [255, 255, 255];
const PDF_MC_MIST: [number, number, number] = [207, 227, 234]; // #cfe3ea — banner department ink
const PDF_MC_CORAL: [number, number, number] = [229, 107, 81]; // #e56b51 — coral accent
const PDF_MC_TEAL: [number, number, number] = [26, 141, 127]; // #1a8d7f — teal label ink
const PDF_MC_TEAL_BRIGHT: [number, number, number] = [26, 155, 134]; // #1a9b86 — BY rule
const PDF_MC_BY_LABEL: [number, number, number] = [20, 122, 110]; // #147a6e — BY label ink
const PDF_MC_TO_LABEL: [number, number, number] = [201, 79, 48]; // #c94f30 — TO label ink

// Word-wraps a letter-spaced caps label into lines (browser-style greedy wrap,
// trailing tracking counted per word like CSS letter-spacing).
function spacedWrapLines(pdf: jsPDF, px: (value: number) => number, options: {
  text: string; fontPx: number; csPx: number; maxW: number;
}) {
  const { text, fontPx, csPx, maxW } = options;
  const cs = px(csPx);
  pdf.setFont('times', 'bold');
  pdf.setFontSize((fontPx * PDF_MM_PER_PX) / 0.352778);
  const wordWidth = (word: string) => pdf.getTextWidth(word) + cs * word.length;
  const spaceWidth = pdf.getTextWidth(' ') + cs;
  const lines: string[][] = [];
  let line: string[] = [];
  let lineWidth = 0;
  text.split(/\s+/).filter(Boolean).forEach((word) => {
    const width = wordWidth(word);
    const gap = line.length ? spaceWidth : 0;
    if (line.length && lineWidth + gap + width > maxW) {
      lines.push(line);
      line = [word];
      lineWidth = width;
    } else {
      line.push(word);
      lineWidth += gap + width;
    }
  });
  if (line.length) lines.push(line);
  return lines;
}

// Draws a letter-spaced caps label with browser-style word wrapping (a long
// "SUBMITTED BY — GROUP: nn" label wraps inside narrow columns/cards, so the
// PDF must wrap the same way instead of shrinking the tracking). Returns the
// number of lines drawn.
function drawPdfSpacedWrap(pdf: jsPDF, px: (value: number) => number, fontPt: (value: number) => number, options: {
  text: string; topPx: number; fontPx: number; csPx: number; x: number; maxW: number; color: [number, number, number];
}) {
  const { text, topPx, fontPx, csPx, x, maxW, color } = options;
  const cs = px(csPx);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(fontPt(fontPx));
  pdf.setTextColor(color[0], color[1], color[2]);
  const lines = spacedWrapLines(pdf, px, { text, fontPx, csPx, maxW });
  lines.forEach((words, index) => {
    const top = topPx + index * fontPx * PDF_LINE_HEIGHT;
    pdf.text(words.join(' '), px(x), px(top + PDF_BASELINE * fontPx), { charSpace: cs });
  });
  return lines.length;
}

// Draws the bordered group member grid (Name | ID) with the exact geometry of
// the .docx-gtable / .pc-gtable / .mc-gtable preview CSS: row height = font ×
// line-height + 2·padY + 1px border, tinted header band, cell baselines at
// padY + PDF_BASELINE·font so the print mirrors the browser 1:1.
function drawPdfGroupGrid(pdf: jsPDF, px: (value: number) => number, fontPt: (value: number) => number, options: {
  x: number; topPx: number; fontPx: number; colWidths: [number, number]; padX: number; padY: number;
  header: [string, string]; rows: Array<{ name: string; id: string }>;
  fill: [number, number, number]; border: [number, number, number];
  headerColor: [number, number, number]; ink: [number, number, number];
}) {
  const { x, topPx, fontPx, colWidths, padX, padY } = options;
  const tableWidth = colWidths[0] + colWidths[1];
  const rowH = fontPx * PDF_LINE_HEIGHT + padY * 2 + 1;
  const tableH = rowH * (options.rows.length + 1);
  pdf.setFillColor(options.fill[0], options.fill[1], options.fill[2]);
  pdf.rect(px(x), px(topPx), px(tableWidth), px(rowH), 'F');
  pdf.setDrawColor(options.border[0], options.border[1], options.border[2]);
  pdf.setLineWidth(px(0.75));
  pdf.rect(px(x), px(topPx), px(tableWidth), px(tableH), 'S');
  pdf.line(px(x), px(topPx + rowH), px(x + tableWidth), px(topPx + rowH));
  pdf.line(px(x + colWidths[0]), px(topPx), px(x + colWidths[0]), px(topPx + tableH));
  const cell = (text: string, cellX: number, rowTop: number, bold: boolean, color: [number, number, number]) => {
    pdf.setFont('times', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontPt(fontPx));
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(text, px(cellX + padX), px(rowTop + padY + PDF_BASELINE * fontPx));
  };
  cell(options.header[0], x, topPx, true, options.headerColor);
  cell(options.header[1], x + colWidths[0], topPx, true, options.headerColor);
  options.rows.forEach((row, index) => {
    const rowTop = topPx + rowH * (index + 1);
    cell(row.name, x, rowTop, false, options.ink);
    cell(row.id, x + colWidths[0], rowTop, false, options.ink);
  });
  return tableH;
}
const PDF_MC_HERO: [number, number, number] = [15, 58, 71]; // #0f3a47 — hero topic ink
const PDF_MC_CARD: [number, number, number] = [244, 250, 249]; // #f4faf9 — card fill

type PdfSegment = { text: string; bold: boolean };

async function createPdf(form: FormState) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const px = (value: number) => value * PDF_MM_PER_PX; // preview px -> mm
  const fontPt = (value: number) => (value * PDF_MM_PER_PX) / 0.352778; // preview px -> PDF points
  const center = 105;
  const contentWidth = px(440); // paper minus its 40px padding on each side
  const blockWidth = px(369.6); // .docx-topic / .docx-submission width (84% of content)
  const blockX = (210 - blockWidth) / 2;

  // Solid, print-safe background. The preview paper is plain white with no extra decoration.
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, 'F');

  // BRUR crest: 62px square, horizontally centered, at 40px page padding + 2% top margin.
  try {
    const logoData = await loadImageDataUrl(logoPath);
    pdf.addImage(logoData, 'PNG', center - px(62) / 2, px(48.8), px(62), px(62), undefined, 'FAST');
  } catch {
    // The cover remains usable if a browser blocks the optional logo rasterization.
  }

  const setRun = (fontPx: number, bold: boolean, color: [number, number, number]) => {
    pdf.setFont('times', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontPt(fontPx));
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  // Word-wrap bold/regular segments exactly like the browser wraps the preview text.
  const wrapSegments = (segments: PdfSegment[], fontPx: number, maxWidth: number) => {
    const words: PdfSegment[] = [];
    segments.forEach((segment) => String(segment.text).split(/\s+/).filter(Boolean).forEach((word) => words.push({ text: word, bold: segment.bold })));
    setRun(fontPx, false, PDF_INK);
    const spaceWidth = pdf.getTextWidth(' ');
    const lines: Array<Array<PdfSegment & { gap: number; width: number }>> = [];
    let line: Array<PdfSegment & { gap: number; width: number }> = [];
    let lineWidth = 0;
    words.forEach((word) => {
      setRun(fontPx, word.bold, PDF_INK);
      const wordWidth = pdf.getTextWidth(word.text);
      const gap = line.length ? spaceWidth : 0;
      if (line.length && lineWidth + gap + wordWidth > maxWidth) {
        lines.push(line);
        line = [{ text: word.text, bold: word.bold, gap: 0, width: wordWidth }];
        lineWidth = wordWidth;
      } else {
        line.push({ text: word.text, bold: word.bold, gap, width: gap + wordWidth });
        lineWidth += gap + wordWidth;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  };

  // Draws one paragraph made of bold/regular segments; returns how many lines it used.
  const drawSegments = (segments: PdfSegment[], topPx: number, fontPx: number, options: { align?: 'center' | 'left'; x?: number; maxWidth?: number; color?: [number, number, number] } = {}) => {
    const lines = wrapSegments(segments, fontPx, options.maxWidth ?? contentWidth);
    const color = options.color ?? PDF_INK;
    lines.forEach((line, index) => {
      const total = line.reduce((sum, word) => sum + word.width, 0);
      let cursor = options.align === 'left' ? (options.x ?? 0) : center - total / 2;
      const baseline = px(topPx + index * fontPx * PDF_LINE_HEIGHT + PDF_BASELINE * fontPx);
      line.forEach((word) => {
        setRun(fontPx, word.bold, color);
        pdf.text(word.text, cursor + word.gap, baseline);
        cursor += word.width;
      });
    });
    return lines.length;
  };
  const advance = (fontPx: number, lineCount: number) => lineCount * fontPx * PDF_LINE_HEIGHT;

  // Vertical cursor in preview pixels; margins mirror the .docx-* CSS. Percentage margins
  // resolve against the containing block width: 8% of 440px = 35.2px for block gaps, and
  // the 1.2% paragraph gap of 369.6px = 4.44px inside the submission blocks.
  const margin = { small: 13.2, tiny: 6.6, large: 44, medium: 15.4, topic: 39.6, block: 35.2, date: 52.8, paragraph: 4.4352 };
  let top = 110.8; // bottom edge of the 62px logo box (top at 48.8px)

  top += margin.small;
  top += advance(21, drawSegments([{ text: form.university || 'Begum Rokeya University', bold: true }], top, 21, { align: 'center' }));
  top += margin.tiny;
  top += advance(14, drawSegments([{ text: form.department || form.teacherDepartment || 'Department', bold: false }], top, 14, { align: 'center' }));
  top += margin.large;
  top += advance(16, drawSegments([{ text: form.assignment || 'Assignment', bold: true }], top, 16, { align: 'center' }));
  top += margin.medium;
  top += advance(11, drawSegments([{ text: 'Session:', bold: true }, { text: form.session || '2024-25', bold: false }], top, 11, { align: 'center' }));
  top += margin.medium;
  top += advance(11, drawSegments([{ text: `Course Title: ${form.courseTitle || 'Course title'}`, bold: false }], top, 11, { align: 'center' }));
  top += margin.medium;
  top += advance(11, drawSegments([{ text: `Course Code: ${form.courseCode || 'Course code'}`, bold: false }], top, 11, { align: 'center' }));

  // Topic pill: #eff6ff box with #2563eb bold text (mirrors .docx-topic).
  top += margin.topic;
  const topicFont = 14;
  const topicPadding = 6.6;
  const topicLines = wrapSegments([{ text: form.topic || 'Assignment topic', bold: true }], topicFont, blockWidth - px(26.4));
  const topicBoxHeight = topicPadding * 2 + topicLines.length * topicFont * PDF_LINE_HEIGHT;
  pdf.setFillColor(PDF_TOPIC_BG[0], PDF_TOPIC_BG[1], PDF_TOPIC_BG[2]);
  pdf.rect(blockX, px(top), blockWidth, px(topicBoxHeight), 'F');
  topicLines.forEach((line, index) => {
    const total = line.reduce((sum, word) => sum + word.width, 0);
    let cursor = center - total / 2;
    const baseline = px(top + topicPadding + index * topicFont * PDF_LINE_HEIGHT + PDF_BASELINE * topicFont);
    line.forEach((word) => {
      setRun(topicFont, true, PDF_TOPIC_INK);
      pdf.text(word.text, cursor + word.gap, baseline);
      cursor += word.width;
    });
  });
  top += topicBoxHeight;

  // Submitted by / Submitted to: left-aligned inside an 84% block, bold labels + regular values.
  const blockLine = (segments: PdfSegment[], cursorPx: number) => drawSegments(segments, cursorPx, 11, { align: 'left', x: blockX, maxWidth: blockWidth });
  const isGroup = form.assignmentType === 'group';

  top += margin.block;
  if (isGroup) {
    top += advance(11, blockLine([{ text: groupLabelOf(form), bold: true }], top));
    top += 14.78; // .docx-gtable margin-top: 4% resolves against the 369.6px block, not the 440px box
    top += drawPdfGroupGrid(pdf, px, fontPt, { x: blockX, topPx: top, fontPx: 11, colWidths: [221.76, 147.84], padX: 8, padY: 2, header: ['Name', 'ID'], rows: groupRows(form), fill: [241, 246, 249], border: [199, 212, 220], headerColor: PDF_INK, ink: PDF_INK });
  } else {
    top += advance(11, blockLine([{ text: 'Submitted by-', bold: true }], top));
    top += margin.paragraph;
    top += advance(11, blockLine([{ text: form.studentName || 'Name', bold: false }], top));
    top += margin.paragraph;
    top += advance(11, blockLine([{ text: 'ID:', bold: true }, { text: form.studentId || 'ID', bold: false }], top));
    top += margin.paragraph;
    top += advance(11, blockLine([{ text: 'Registration no:', bold: true }, { text: form.registrationNo || 'Registration no', bold: false }], top));
  }

  top += margin.block; // adjacent block margins collapse in CSS: max(1.2%, 8%) = 8%
  top += advance(11, blockLine([{ text: 'Submitted to-', bold: true }], top));
  top += margin.paragraph;
  top += advance(11, blockLine([{ text: form.teacherName || 'Teacher name', bold: false }], top));
  top += margin.paragraph;
  top += advance(11, blockLine([{ text: form.teacherDesignation || 'Designation', bold: false }], top));
  top += margin.paragraph;
  top += advance(11, blockLine([{ text: form.teacherDepartment || 'Department', bold: false }], top));
  top += margin.paragraph;
  top += advance(11, blockLine([{ text: form.university || 'University', bold: false }], top));

  top += isGroup ? 8.8 : margin.date; // .docx-date margin-top: 12% of 440px; group mode .group-on: 2% = 8.8px
  drawSegments([{ text: 'Date of submission:', bold: true }, { text: form.date || 'Date', bold: false }], top, 13, { align: 'center' });

  pdf.setProperties({ title: form.topic || 'BRUR assignment cover', subject: 'A4 assignment cover' });
  return pdf.output('blob');
}

// Professional cover PDF: mirrors the .pc-* preview CSS 1:1 with the same
// preview-px -> mm mapping as createPdf (520px sheet -> A4). The vertical
// cursor runs in preview pixels and every percentage margin resolves against
// the 440px desktop content box, exactly like the stylesheet does.
async function createProfessionalPdf(form: FormState) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const px = (value: number) => value * PDF_MM_PER_PX;
  const fontPt = (value: number) => (value * PDF_MM_PER_PX) / 0.352778;
  const center = 105;
  const contentWidth = px(440); // sheet minus its 40px padding on each side
  const blockWidth = px(369.6); // .pc-topic / .pc-columns width (84% of content)
  const blockX = (210 - blockWidth) / 2;
  const colGap = px(28); // .pc-columns gap: 6.36% of 440px
  const colWidth = (blockWidth - colGap) / 2;
  const colX = [blockX, blockX + colWidth + colGap];

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, 'F');

  // Double certificate frame: 2px navy rule at 14px inset + 0.9px hairline at 18px.
  pdf.setDrawColor(PDF_NAVY[0], PDF_NAVY[1], PDF_NAVY[2]);
  pdf.setLineWidth(px(2));
  pdf.rect(px(14), px(14), 210 - px(28), 297 - px(28), 'S');
  pdf.setDrawColor(PDF_HAIR[0], PDF_HAIR[1], PDF_HAIR[2]);
  pdf.setLineWidth(px(0.9));
  pdf.rect(px(18), px(18), 210 - px(36), 297 - px(36), 'S');

  // BRUR crest: 64px square, horizontally centered, right on the 40px padding line.
  try {
    const logoData = await loadImageDataUrl(logoPath);
    pdf.addImage(logoData, 'PNG', center - px(32), px(40), px(64), px(64), undefined, 'FAST');
  } catch {
    // The cover remains usable if a browser blocks the optional logo rasterization.
  }

  const setRun = (fontPx: number, bold: boolean, color: [number, number, number]) => {
    pdf.setFont('times', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontPt(fontPx));
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  // Word-wrap bold/regular segments exactly like the browser wraps the preview text.
  const wrap = (segments: PdfSegment[], fontPx: number, maxWidth: number) => {
    const words: PdfSegment[] = [];
    segments.forEach((segment) => String(segment.text).split(/\s+/).filter(Boolean).forEach((word) => words.push({ text: word, bold: segment.bold })));
    setRun(fontPx, false, PDF_INK);
    const spaceWidth = pdf.getTextWidth(' ');
    const lines: Array<Array<PdfSegment & { gap: number; width: number }>> = [];
    let line: Array<PdfSegment & { gap: number; width: number }> = [];
    let lineWidth = 0;
    words.forEach((word) => {
      setRun(fontPx, word.bold, PDF_INK);
      const wordWidth = pdf.getTextWidth(word.text);
      const gap = line.length ? spaceWidth : 0;
      if (line.length && lineWidth + gap + wordWidth > maxWidth) {
        lines.push(line);
        line = [{ text: word.text, bold: word.bold, gap: 0, width: wordWidth }];
        lineWidth = wordWidth;
      } else {
        line.push({ text: word.text, bold: word.bold, gap, width: gap + wordWidth });
        lineWidth += gap + wordWidth;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  };

  // Draws one paragraph; bold words take boldColor, regular words regColor.
  const drawPara = (segments: PdfSegment[], topPx: number, fontPx: number, options: { align?: 'center' | 'left'; x?: number; maxWidth?: number; boldColor?: [number, number, number]; regColor?: [number, number, number]; color?: [number, number, number] } = {}) => {
    const lines = wrap(segments, fontPx, options.maxWidth ?? contentWidth);
    const boldColor = options.boldColor ?? options.color ?? PDF_INK;
    const regColor = options.regColor ?? options.color ?? PDF_INK;
    lines.forEach((line, index) => {
      const total = line.reduce((sum, word) => sum + word.width, 0);
      let cursor = options.align === 'left' ? (options.x ?? 0) : center - total / 2;
      const baseline = px(topPx + index * fontPx * PDF_LINE_HEIGHT + PDF_BASELINE * fontPx);
      line.forEach((word) => {
        setRun(fontPx, word.bold, word.bold ? boldColor : regColor);
        pdf.text(word.text, cursor + word.gap, baseline);
        cursor += word.width;
      });
    });
    return lines.length;
  };
  const advance = (fontPx: number, lineCount: number) => lineCount * fontPx * PDF_LINE_HEIGHT;

  // Vertical cursor in preview px; margins mirror the .pc-* CSS percentages
  // of the 440px content box (3.5% = 15.4px, 1.2% = 5.28px, ...).
  const margin = { uni: 15.4, dept: 5.28, rule: 10.56, ruleH: 2.2, assign: 33, session: 19.36, meta: 7.92, topic: 39.6, topicPad: 9.68, cols: 44, labelRule: 3, colRuleH: 1.6, name: 8, line: 4, date: 132 };
  let top = 40; // .cover-paper sm:p-10 padding-top
  top += 64; // .pc-logo crest box

  top += margin.uni; // .pc-university margin-top: 3.5%
  top += advance(20, drawPara([{ text: (form.university || 'Begum Rokeya University').toUpperCase(), bold: true }], top, 20, { color: PDF_NAVY }));
  top += margin.dept; // .pc-department margin-top: 1.2%
  top += advance(12.5, drawPara([{ text: form.department || form.teacherDepartment || 'Department', bold: false }], top, 12.5, { color: PDF_SOFT }));

  top += margin.rule; // .pc-rule margin-top: 2.4%
  pdf.setFillColor(PDF_GOLD[0], PDF_GOLD[1], PDF_GOLD[2]);
  pdf.rect(center - px(22), px(top), px(44), px(margin.ruleH), 'F');
  top += margin.ruleH;

  top += margin.assign; // .pc-assignment margin-top: 7.5%
  const assignmentText = (form.assignment || 'Assignment').toUpperCase();
  setRun(15, true, PDF_NAVY);
  const csAssign = px(2.4); // letter-spacing: .16em of 15px
  const assignWidth = pdf.getTextWidth(assignmentText) + csAssign * Math.max(assignmentText.length - 1, 0);
  if (assignWidth <= contentWidth) {
    pdf.text(assignmentText, center - assignWidth / 2, px(top + PDF_BASELINE * 15), { charSpace: csAssign });
    top += advance(15, 1);
  } else {
    top += advance(15, drawPara([{ text: assignmentText, bold: true }], top, 15, { color: PDF_NAVY }));
  }

  top += margin.session; // .pc-session margin-top: 4.4%
  top += advance(11, drawPara([{ text: 'Session:', bold: true }, { text: form.session || '2024-25', bold: false }], top, 11, { boldColor: PDF_NAVY, regColor: PDF_INK }));
  top += margin.meta; // .pc-meta margin-top: 1.8%
  top += advance(11, drawPara([{ text: 'Course Title:', bold: true }, { text: form.courseTitle || 'Course title', bold: false }], top, 11, { boldColor: PDF_NAVY, regColor: PDF_INK }));
  top += margin.meta;
  top += advance(11, drawPara([{ text: 'Course Code:', bold: true }, { text: form.courseCode || 'Course code', bold: false }], top, 11, { boldColor: PDF_NAVY, regColor: PDF_INK }));

  // Topic band: light fill framed by 2.2px navy top/bottom rules (mirrors .pc-topic).
  // Border-box: the two 2.2px borders add 4.4px to the band height in the browser too.
  top += margin.topic; // .pc-topic margin-top: 9%
  const topicFont = 14;
  const topicLines = wrap([{ text: form.topic || 'Assignment topic', bold: true }], topicFont, blockWidth - px(26.4));
  const bandHeight = margin.topicPad * 2 + topicLines.length * topicFont * PDF_LINE_HEIGHT + margin.ruleH * 2;
  pdf.setFillColor(PDF_BAND[0], PDF_BAND[1], PDF_BAND[2]);
  pdf.rect(blockX, px(top), blockWidth, px(bandHeight), 'F');
  pdf.setFillColor(PDF_NAVY[0], PDF_NAVY[1], PDF_NAVY[2]);
  pdf.rect(blockX, px(top), blockWidth, px(margin.ruleH), 'F');
  pdf.rect(blockX, px(top + bandHeight - margin.ruleH), blockWidth, px(margin.ruleH), 'F');
  topicLines.forEach((line, index) => {
    const total = line.reduce((sum, word) => sum + word.width, 0);
    let cursor = center - total / 2;
    const baseline = px(top + margin.ruleH + margin.topicPad + index * topicFont * PDF_LINE_HEIGHT + PDF_BASELINE * topicFont);
    line.forEach((word) => {
      setRun(topicFont, true, PDF_NAVY);
      pdf.text(word.text, cursor + word.gap, baseline);
      cursor += word.width;
    });
  });
  top += bandHeight;

  // Submitted by / Submitted to: two left-aligned columns inside the 84% block.
  const isGroup = form.assignmentType === 'group';
  const drawColumn = (x: number, label: string, name: string | null, details: PdfSegment[][], group: Array<{ name: string; id: string }> | null) => {
    let cursor = top;
    // Letter-spaced caps label; long group labels wrap word-by-word like the browser.
    const labelLines = drawPdfSpacedWrap(pdf, px, fontPt, { text: label.toUpperCase(), topPx: cursor, fontPx: 10, csPx: 1.4, x, maxW: colWidth, color: PDF_NAVY });
    cursor += 10 * PDF_LINE_HEIGHT * labelLines;
    pdf.setFillColor(PDF_GOLD[0], PDF_GOLD[1], PDF_GOLD[2]);
    pdf.rect(x, px(cursor + margin.labelRule), px(30), px(margin.colRuleH), 'F');
    cursor += margin.labelRule + margin.colRuleH + margin.name;
    if (name !== null) {
      cursor += advance(11.5, drawPara([{ text: name, bold: true }], cursor, 11.5, { align: 'left', x, maxWidth: colWidth, color: PDF_INK }));
    } else if (group) {
      cursor += drawPdfGroupGrid(pdf, px, fontPt, { x, topPx: cursor, fontPx: 9.5, colWidths: [102.48, 68.32], padX: 5, padY: 2.5, header: ['Name', 'ID'], rows: group, fill: [248, 251, 252], border: [185, 205, 213], headerColor: PDF_NAVY, ink: PDF_INK });
    }
    details.forEach((segments) => {
      cursor += margin.line; // .pc-line margin-top: 4px
      cursor += advance(10.5, drawPara(segments, cursor, 10.5, { align: 'left', x, maxWidth: colWidth, boldColor: PDF_NAVY, regColor: PDF_INK }));
    });
    return cursor;
  };

  top += margin.cols; // .pc-columns margin-top: 10%
  const leftBottom = drawColumn(colX[0], isGroup ? `Submitted By — Group: ${groupNoOf(form)}` : 'Submitted By', isGroup ? null : form.studentName || 'Name', isGroup ? [] : [[{ text: 'ID:', bold: true }, { text: form.studentId || 'ID', bold: false }], [{ text: 'Registration no:', bold: true }, { text: form.registrationNo || 'Registration no', bold: false }]], isGroup ? groupRows(form) : null);
  const rightBottom = drawColumn(colX[1], 'Submitted To', form.teacherName || 'Teacher name', [[{ text: form.teacherDesignation || 'Designation', bold: false }], [{ text: form.teacherDepartment || 'Department', bold: false }], [{ text: form.university || 'University', bold: false }]], null);
  top = Math.max(leftBottom, rightBottom); // flex container height = tallest column

  top += isGroup ? 88 : margin.date; // .pc-date margin-top: 30% of 440px = 132px; group mode .group-on: 20% = 88px
  drawPara([{ text: 'Date of submission:', bold: true }, { text: form.date || 'Date', bold: false }], top, 12.5, { align: 'center', boldColor: PDF_NAVY, regColor: PDF_INK });

  pdf.setProperties({ title: form.topic || 'BRUR assignment cover', subject: 'A4 assignment cover' });
  return pdf.output('blob');
}

// Modern cover PDF: mirrors the .mc-* preview CSS 1:1 with the same
// preview-px -> mm mapping as the other designs (520px sheet -> A4). The
// modern cover drops the paper padding, so on the desktop preview 1cqw
// resolves against the full 520px sheet: the CSS cqw values and the PDF
// cursor below use the exact same pixel numbers.
async function createModernPdf(form: FormState) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const px = (value: number) => value * PDF_MM_PER_PX;
  const fontPt = (value: number) => (value * PDF_MM_PER_PX) / 0.352778;
  const center = 105;
  const contentWidth = px(440); // banner text keeps a 40px gutter on each side
  const heroWidth = px(457.6); // .mc-topic / .mc-cards width: 88% of the 520px sheet
  const cardInner = px(192.8); // card 220.8px minus its 14px padding on each side

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, 'F');

  // Full-bleed navy banner and the coral base strip (decorative circles were
  // removed for a cleaner, distraction-free cover).
  pdf.setFillColor(PDF_NAVY[0], PDF_NAVY[1], PDF_NAVY[2]);
  pdf.rect(0, 0, 210, px(196), 'F');
  pdf.setFillColor(PDF_MC_CORAL[0], PDF_MC_CORAL[1], PDF_MC_CORAL[2]);
  pdf.rect(0, px(196), 210, px(4), 'F');

  // Crest chip: white rounded square with the BRUR crest inset.
  try {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(px(228), px(36), px(64), px(64), px(14), px(14), 'F');
    const logoData = await loadImageDataUrl(logoPath);
    pdf.addImage(logoData, 'PNG', px(234), px(42), px(52), px(52), undefined, 'FAST');
  } catch {
    // The cover remains usable if a browser blocks the optional logo rasterization.
  }

  const setRun = (fontPx: number, bold: boolean, color: [number, number, number]) => {
    pdf.setFont('times', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontPt(fontPx));
    pdf.setTextColor(color[0], color[1], color[2]);
  };

  // Word-wrap bold/regular segments exactly like the browser wraps the preview text.
  const wrap = (segments: PdfSegment[], fontPx: number, maxWidth: number) => {
    const words: PdfSegment[] = [];
    segments.forEach((segment) => String(segment.text).split(/\s+/).filter(Boolean).forEach((word) => words.push({ text: word, bold: segment.bold })));
    setRun(fontPx, false, PDF_INK);
    const spaceWidth = pdf.getTextWidth(' ');
    const lines: Array<Array<PdfSegment & { gap: number; width: number }>> = [];
    let line: Array<PdfSegment & { gap: number; width: number }> = [];
    let lineWidth = 0;
    words.forEach((word) => {
      setRun(fontPx, word.bold, PDF_INK);
      const wordWidth = pdf.getTextWidth(word.text);
      const gap = line.length ? spaceWidth : 0;
      if (line.length && lineWidth + gap + wordWidth > maxWidth) {
        lines.push(line);
        line = [{ text: word.text, bold: word.bold, gap: 0, width: wordWidth }];
        lineWidth = wordWidth;
      } else {
        line.push({ text: word.text, bold: word.bold, gap, width: gap + wordWidth });
        lineWidth += gap + wordWidth;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  };

  // Draws one paragraph; bold words take boldColor, regular words regColor.
  const drawPara = (segments: PdfSegment[], topPx: number, fontPx: number, options: { align?: 'center' | 'left'; x?: number; maxWidth?: number; boldColor?: [number, number, number]; regColor?: [number, number, number]; color?: [number, number, number] } = {}) => {
    const lines = wrap(segments, fontPx, options.maxWidth ?? contentWidth);
    const boldColor = options.boldColor ?? options.color ?? PDF_INK;
    const regColor = options.regColor ?? options.color ?? PDF_INK;
    lines.forEach((line, index) => {
      const total = line.reduce((sum, word) => sum + word.width, 0);
      let cursor = options.align === 'left' ? (options.x ?? 0) : center - total / 2;
      const baseline = px(topPx + index * fontPx * PDF_LINE_HEIGHT + PDF_BASELINE * fontPx);
      line.forEach((word) => {
        setRun(fontPx, word.bold, word.bold ? boldColor : regColor);
        pdf.text(word.text, cursor + word.gap, baseline);
        cursor += word.width;
      });
    });
    return lines.length;
  };
  const advance = (fontPx: number, lineCount: number) => lineCount * fontPx * PDF_LINE_HEIGHT;
  // Letter-spaced caps line (mirrors CSS letter-spacing via jsPDF charSpace).
  const drawSpaced = (text: string, topPx: number, fontPx: number, csPx: number, color: [number, number, number], x?: number) => {
    setRun(fontPx, true, color);
    const cs = px(csPx);
    const width = pdf.getTextWidth(text) + cs * Math.max(text.length - 1, 0);
    pdf.text(text, x ?? center - width / 2, px(topPx + PDF_BASELINE * fontPx), { charSpace: cs });
  };

  // Banner contents (fixed positions inside the 196px navy area).
  const universityText = (form.university || 'Begum Rokeya University').toUpperCase();
  setRun(20, true, PDF_WHITE);
  const csUni = px(1.6); // letter-spacing: 0.08em of 20px
  if (pdf.getTextWidth(universityText) + csUni * Math.max(universityText.length - 1, 0) <= contentWidth) {
    drawSpaced(universityText, 114, 20, 1.6, PDF_WHITE);
  } else {
    drawPara([{ text: universityText, bold: true }], 114, 20, { align: 'center', maxWidth: contentWidth, color: PDF_WHITE });
  }
  drawPara([{ text: form.department || form.teacherDepartment || 'Department', bold: false }], 144, 12.5, { align: 'center', maxWidth: contentWidth, color: PDF_MC_MIST });

  // Vertical cursor in preview px; margins mirror the .mc-* CSS.
  const margin = { eyebrow: 30, topic: 12, rule: 14, ruleH: 4, metaFirst: 20, meta: 7, cards: 26, cardPad: 14, labelRule: 5, cardRuleH: 3, name: 9, line: 5, date: 130 };
  let top = 200; // banner bottom edge (196px navy + 4px coral strip)
  top += margin.eyebrow;
  const assignmentText = (form.assignment || 'Assignment').toUpperCase();
  setRun(11, true, PDF_MC_CORAL);
  const csEyebrow = px(2.64); // letter-spacing: 0.24em of 11px
  const eyebrowWidth = pdf.getTextWidth(assignmentText) + csEyebrow * Math.max(assignmentText.length - 1, 0);
  if (eyebrowWidth <= contentWidth) {
    pdf.text(assignmentText, center - eyebrowWidth / 2, px(top + PDF_BASELINE * 11), { charSpace: csEyebrow });
    top += advance(11, 1);
  } else {
    top += advance(11, drawPara([{ text: assignmentText, bold: true }], top, 11, { align: 'center', maxWidth: contentWidth, color: PDF_MC_CORAL }));
  }

  top += margin.topic;
  top += advance(22, drawPara([{ text: form.topic || 'Assignment topic', bold: true }], top, 22, { align: 'center', maxWidth: heroWidth, color: PDF_MC_HERO }));

  top += margin.rule;
  pdf.setFillColor(PDF_MC_CORAL[0], PDF_MC_CORAL[1], PDF_MC_CORAL[2]);
  pdf.rect(center - px(28), px(top), px(56), px(margin.ruleH), 'F');
  top += margin.ruleH;

  top += margin.metaFirst;
  top += advance(11.5, drawPara([{ text: 'Session:', bold: true }, { text: form.session || '2024-25', bold: false }], top, 11.5, { align: 'center', boldColor: PDF_MC_TEAL, regColor: PDF_SOFT }));
  top += margin.meta;
  top += advance(11.5, drawPara([{ text: 'Course Title:', bold: true }, { text: form.courseTitle || 'Course title', bold: false }], top, 11.5, { align: 'center', boldColor: PDF_MC_TEAL, regColor: PDF_SOFT }));
  top += margin.meta;
  top += advance(11.5, drawPara([{ text: 'Course Code:', bold: true }, { text: form.courseCode || 'Course code', bold: false }], top, 11.5, { align: 'center', boldColor: PDF_MC_TEAL, regColor: PDF_SOFT }));

  // Submitted By / Submitted To tinted cards. The browser flex row stretches
  // both cards to the tallest column, so the same two-pass measure/draw model
  // is used here: measure both columns, fill the card rectangles, then draw.
  const isGroup = form.assignmentType === 'group';
  top += margin.cards;
  const cardsTop = top;
  const makeColumn = (x: number, label: string, labelColor: [number, number, number], ruleColor: [number, number, number], name: string | null, details: PdfSegment[][], group: Array<{ name: string; id: string }> | null) => {
    const innerX = px(x + margin.cardPad);
    return (draw: boolean) => {
      let cursor = cardsTop + margin.cardPad;
      // Letter-spaced caps label; long group labels wrap word-by-word like the
      // browser. Measure pass counts lines without drawing.
      const labelLines = spacedWrapLines(pdf, px, { text: label.toUpperCase(), fontPx: 9.5, csPx: 1.52, maxW: cardInner }).length;
      if (draw) {
        drawPdfSpacedWrap(pdf, px, fontPt, { text: label.toUpperCase(), topPx: cursor, fontPx: 9.5, csPx: 1.52, x: x + margin.cardPad, maxW: cardInner, color: labelColor });
      }
      cursor += advance(9.5, labelLines);
      if (draw) {
        pdf.setFillColor(ruleColor[0], ruleColor[1], ruleColor[2]);
        pdf.rect(innerX, px(cursor + margin.labelRule), px(24), px(margin.cardRuleH), 'F');
      }
      cursor += margin.labelRule + margin.cardRuleH;
      if (name !== null) {
        cursor += margin.name;
        cursor += advance(11.5, drawPara([{ text: name, bold: true }], cursor, 11.5, { align: 'left', x: innerX, maxWidth: cardInner, color: PDF_INK }));
      } else if (group) {
        cursor += 9; // .mc-gtable margin-top: 1.7308cqw ≈ 9px
        cursor += drawPdfGroupGrid(pdf, px, fontPt, { x: x + margin.cardPad, topPx: cursor, fontPx: 10, colWidths: [115.68, 77.12], padX: 5, padY: 2.5, header: ['Name', 'ID'], rows: group, fill: [234, 245, 242], border: [207, 226, 220], headerColor: PDF_MC_BY_LABEL, ink: PDF_INK });
      }
      details.forEach((segments) => {
        cursor += margin.line;
        cursor += advance(10.5, drawPara(segments, cursor, 10.5, { align: 'left', x: innerX, maxWidth: cardInner, boldColor: PDF_MC_HERO, regColor: PDF_SOFT }));
      });
      return cursor + margin.cardPad;
    };
  };
  const leftBottomOf = makeColumn(31.2, isGroup ? `Submitted By — Group: ${groupNoOf(form)}` : 'Submitted By', PDF_MC_BY_LABEL, PDF_MC_TEAL_BRIGHT, isGroup ? null : form.studentName || 'Name', isGroup ? [] : [[{ text: 'ID:', bold: true }, { text: form.studentId || 'ID', bold: false }], [{ text: 'Registration no:', bold: true }, { text: form.registrationNo || 'Registration no', bold: false }]], isGroup ? groupRows(form) : null);
  const rightBottomOf = makeColumn(268, 'Submitted To', PDF_MC_TO_LABEL, PDF_MC_CORAL, form.teacherName || 'Teacher name', [[{ text: form.teacherDesignation || 'Designation', bold: false }], [{ text: form.teacherDepartment || 'Department', bold: false }], [{ text: form.university || 'University', bold: false }]], null);
  const cardsHeight = Math.max(leftBottomOf(false), rightBottomOf(false)) - cardsTop;
  pdf.setFillColor(PDF_MC_CARD[0], PDF_MC_CARD[1], PDF_MC_CARD[2]);
  pdf.roundedRect(px(31.2), px(cardsTop), px(220.8), px(cardsHeight), px(10), px(10), 'F');
  pdf.roundedRect(px(268), px(cardsTop), px(220.8), px(cardsHeight), px(10), px(10), 'F');
  leftBottomOf(true);
  rightBottomOf(true);

  top = cardsTop + cardsHeight;
  top += isGroup ? 70 : margin.date; // .mc-date margin-top: 130px (25cqw); group mode .group-on: 70px (13.4615cqw)
  drawPara([{ text: 'Date of submission:', bold: true }, { text: form.date || 'Date', bold: false }], top, 12, { align: 'center', boldColor: PDF_MC_TEAL, regColor: PDF_INK });

  pdf.setProperties({ title: form.topic || 'BRUR assignment cover', subject: 'A4 assignment cover' });
  return pdf.output('blob');
}

function coverHtml(form: FormState) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
  const rows = groupRows(form);
  const groupBlock = form.assignmentType === 'group'
    ? `<p><strong>Submitted by — GROUP: ${escape(groupNoOf(form))}</strong></p><table class="gtable"><thead><tr><th>Name</th><th>ID</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escape(row.name)}</td><td>${escape(row.id)}</td></tr>`).join('')}</tbody></table>`
    : `<p><strong>Submitted by-</strong><br><span class="value">${escape(form.studentName)}</span><br><strong>ID:</strong> <span class="value">${escape(form.studentId)}</span><br><strong>Registration no:</strong> <span class="value">${escape(form.registrationNo)}</span></p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(form.topic || 'BRUR assignment cover')}</title><style>@page{size:A4;margin:0}body{font-family:"Times New Roman",Times,serif;color:#111;margin:0}.cover{box-sizing:border-box;width:210mm;min-height:297mm;margin:auto;padding:24mm 25mm;text-align:center;border-top:2mm solid #1a8d7f}.logo{width:24mm;height:24mm;object-fit:contain;margin:0 auto 7mm}.university{font-size:24pt;font-weight:700;margin:0 0 5mm}.department{font-size:16pt;margin:0 0 20mm}.assignment{font-size:18pt;font-weight:700;margin:0 0 12mm}.meta{font-size:12pt;margin:0 0 4mm}.topic{display:inline-block;max-width:170mm;margin:10mm auto 0;padding:3mm 6mm;color:#2563eb;background:#eff6ff;font-size:16pt;font-weight:700}.details{width:160mm;margin:24mm auto 0;text-align:left;font-size:12pt;line-height:1.5}.details p{margin:0 0 8mm}.details strong{font-weight:700}.value{font-weight:400}.gtable{border-collapse:collapse;width:100%;margin:0 0 8mm;font-size:12pt}.gtable th,.gtable td{border:1px solid #c7d4dc;padding:2mm 3mm;text-align:left}.gtable th{background:#f1f6f9}.date{font-size:12pt;margin-top:24mm;text-align:center}</style></head><body><main class="cover"><img class="logo" src="${logoPath}" alt="BRUR logo"><p class="university">${escape(form.university || 'BEGUM ROKEYA UNIVERSITY')}</p><p class="department">${escape(form.department || form.teacherDepartment || 'Department')}</p><p class="assignment">${escape(form.assignment || 'ASSIGNMENT')}</p><p class="meta"><span>Course Code: </span><span class="value">${escape(form.courseCode)}</span></p><p class="meta"><span>Course Title: </span><span class="value">${escape(form.courseTitle)}</span></p><p class="meta"><strong>Session:</strong> <span class="value">${escape(form.session)}</span></p><p class="topic">${escape(form.topic || 'Untitled assignment')}</p><section class="details">${groupBlock}<p><strong>Submitted to-</strong><br><span class="value">${escape(form.teacherName)}<br>${escape(form.teacherDesignation)}<br>${escape(form.teacherDepartment)}<br>${escape(form.university)}</span></p><p class="date"><strong>Date of submission:</strong> <span class="value">${escape(form.date)}</span></p></section></main></body></html>`;
}

function Router() {
  return <AppShell><ErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></ErrorBoundary></AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;