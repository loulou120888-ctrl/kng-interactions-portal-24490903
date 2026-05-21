import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  MODULES,
  ALL_LESSONS,
  TOTAL_LESSONS,
  QUIZ_QUESTIONS,
  PASSING_SCORE,
  type Module,
  type Lesson,
  type SectionBlock,
  type QuizQuestion,
} from "@/components/mentoring/mentoring-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, ChevronRight, ChevronLeft, CheckCircle2, Circle,
  Lock, Trophy, RotateCcw, ArrowLeft, Shield, Users, Trash2,
  BookOpen, ClipboardCheck, AlertTriangle, Lightbulb, Info,
  Star, Clock, Check, X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_portal/mentoring")({ component: Mentoring });

type View = "dashboard" | "lesson" | "quiz" | "quiz-result" | "complete" | "admin";

interface QuizResult { score: number; total: number; passed: boolean }

function Mentoring() {
  const { user, isAdmPlus } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    if (!user?.id) return;
    const [{ data: prog }, { data: qr }] = await Promise.all([
      supabase.from("mentoring_progress" as any).select("lesson_id").eq("user_id", user.id),
      supabase.from("mentoring_quiz_results" as any).select("passed").eq("user_id", user.id).eq("passed", true).limit(1),
    ]);
    setCompletedLessons(new Set((prog ?? []).map((r: any) => r.lesson_id)));
    setQuizPassed((qr ?? []).length > 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const allLessonsComplete = TOTAL_LESSONS > 0 && completedLessons.size >= TOTAL_LESSONS;

  async function markLessonComplete(lessonId: string) {
    if (!user?.id || completedLessons.has(lessonId)) return;
    await supabase.from("mentoring_progress" as any).upsert({ user_id: user.id, lesson_id: lessonId });
    setCompletedLessons(prev => new Set([...prev, lessonId]));
  }

  function openLesson(mod: Module, lesson: Lesson) {
    setActiveModule(mod);
    setActiveLesson(lesson);
    setView("lesson");
  }

  function handleQuizComplete(result: QuizResult) {
    setQuizResult(result);
    setView("quiz-result");
    if (result.passed) setQuizPassed(true);
  }

  function percentComplete(mod: Module) {
    const done = mod.lessons.filter(l => completedLessons.has(l.id)).length;
    return Math.round((done / mod.lessons.length) * 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground animate-pulse">Loading mentoring programme…</div>
      </div>
    );
  }

  if (view === "lesson" && activeModule && activeLesson) {
    const allLessons = activeModule.lessons;
    const idx = allLessons.findIndex(l => l.id === activeLesson.id);
    const prevLesson = allLessons[idx - 1] ?? null;
    const nextLesson = allLessons[idx + 1] ?? null;
    const isComplete = completedLessons.has(activeLesson.id);

    return (
      <LessonView
        module={activeModule}
        lesson={activeLesson}
        isComplete={isComplete}
        onComplete={() => markLessonComplete(activeLesson.id)}
        onPrev={prevLesson ? () => setActiveLesson(prevLesson) : null}
        onNext={nextLesson ? () => setActiveLesson(nextLesson) : null}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "quiz") {
    return <QuizView onComplete={handleQuizComplete} onBack={() => setView("dashboard")} />;
  }

  if (view === "quiz-result" && quizResult) {
    return (
      <QuizResultView
        result={quizResult}
        onRetry={() => setView("quiz")}
        onDone={() => setView("dashboard")}
      />
    );
  }

  if (view === "admin" && isAdmPlus) {
    return <AdminView onBack={() => setView("dashboard")} />;
  }

  const overallPct = TOTAL_LESSONS > 0 ? Math.round((completedLessons.size / TOTAL_LESSONS) * 100) : 0;

  const nextIncomplete = ALL_LESSONS.find(l => !completedLessons.has(l.id));
  const nextIncompleteModule = nextIncomplete
    ? MODULES.find(m => m.lessons.some(l => l.id === nextIncomplete.id)) ?? null
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> KNG Staff Academy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete all modules and pass the final quiz to finish your mentoring.
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmPlus && (
            <Button variant="outline" size="sm" onClick={() => setView("admin")}>
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Admin
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-card/60 rounded-2xl col-span-1 md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold text-primary">{overallPct}%</span>
          </div>
          <Progress value={overallPct} className="h-2.5" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{completedLessons.size} of {TOTAL_LESSONS} lessons complete</span>
            {quizPassed && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Quiz passed
              </span>
            )}
          </div>
          {nextIncomplete && nextIncompleteModule && (
            <Button
              className="w-full mt-1"
              onClick={() => openLesson(nextIncompleteModule, nextIncomplete)}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {completedLessons.size === 0 ? "Start Learning" : "Continue Learning"}
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          )}
          {allLessonsComplete && !quizPassed && (
            <Button className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-black" onClick={() => setView("quiz")}>
              <ClipboardCheck className="h-4 w-4 mr-2" /> Take the Final Quiz
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          )}
          {allLessonsComplete && quizPassed && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl p-3 mt-1">
              <Trophy className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <span className="text-sm font-medium text-green-400">Mentoring Complete! You are a fully trained KNG staff member.</span>
            </div>
          )}
        </Card>
        <Card className="p-5 bg-card/60 rounded-2xl space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Modules</span>
              <Badge variant="outline">{MODULES.filter(m => percentComplete(m) === 100).length}/{MODULES.length}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lessons</span>
              <Badge variant="outline">{completedLessons.size}/{TOTAL_LESSONS}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Final Quiz</span>
              {quizPassed
                ? <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Passed</Badge>
                : allLessonsComplete
                  ? <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Unlocked</Badge>
                  : <Badge variant="outline" className="opacity-50"><Lock className="h-3 w-3 mr-1" />Locked</Badge>
              }
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((mod, i) => {
            const pct = percentComplete(mod);
            const done = pct === 100;
            return (
              <Card
                key={mod.id}
                className={`rounded-2xl bg-gradient-to-br ${mod.gradient} border border-border/60 p-5 space-y-3 transition-all hover:border-primary/40`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mod.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{mod.title}</p>
                        {done && <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">{mod.lessons.length} lessons</Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="space-y-1.5">
                  {mod.lessons.map(lesson => {
                    const lDone = completedLessons.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => openLesson(mod, lesson)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors group"
                      >
                        {lDone
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
                        }
                        <span className={`flex-1 ${lDone ? "text-muted-foreground line-through" : "text-foreground"}`}>{lesson.title}</span>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{lesson.estimatedMins}m</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {allLessonsComplete && (
        <Card className={`rounded-2xl p-5 border flex items-center gap-4 ${
          quizPassed
            ? "bg-green-500/10 border-green-500/30"
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <ClipboardCheck className={`h-8 w-8 flex-shrink-0 ${quizPassed ? "text-green-400" : "text-amber-400"}`} />
          <div className="flex-1">
            <p className="font-semibold">{quizPassed ? "Final Quiz — Passed ✓" : "Final Quiz — Ready"}</p>
            <p className="text-sm text-muted-foreground">
              {quizPassed
                ? "You have completed all modules and passed the final quiz. Mentoring complete."
                : "You have completed all modules. Take the final quiz to complete your mentoring (80% pass mark)."}
            </p>
          </div>
          {!quizPassed && (
            <Button onClick={() => setView("quiz")} className="bg-amber-500 hover:bg-amber-600 text-black flex-shrink-0">
              Start Quiz <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

function SlideBlock({ block }: { block: SectionBlock }) {
  const calloutMeta = {
    info:    { bar: "bg-blue-500",   bg: "bg-blue-500/10 border-blue-500/30",   icon: <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />,    label: "text-blue-400" },
    tip:     { bar: "bg-green-500",  bg: "bg-green-500/10 border-green-500/30",  icon: <Lightbulb className="h-5 w-5 text-green-400 flex-shrink-0" />, label: "text-green-400" },
    warning: { bar: "bg-amber-500",  bg: "bg-amber-500/10 border-amber-500/30",  icon: <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />, label: "text-amber-400" },
    danger:  { bar: "bg-red-500",    bg: "bg-red-500/10 border-red-500/30",      icon: <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />,   label: "text-red-400" },
  };

  if (block.type === "heading") {
    return (
      <div className="flex items-center gap-3 pt-1">
        <div className="h-7 w-1 rounded-full bg-primary flex-shrink-0" />
        <h3 className="text-lg font-bold tracking-tight">{block.text}</h3>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-primary/70 flex-shrink-0" />
            <span className="text-sm font-medium leading-snug">{item}</span>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "checklist") {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle2 className="h-4.5 w-4.5 text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium leading-snug">{item}</span>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "callout") {
    const m = calloutMeta[block.variant];
    return (
      <div className={`rounded-xl border ${m.bg} overflow-hidden`}>
        <div className={`h-1 w-full ${m.bar}`} />
        <div className="flex items-start gap-3 p-4">
          {m.icon}
          <div className="space-y-1">
            {block.title && <p className={`text-xs font-bold uppercase tracking-widest ${m.label}`}>{block.title}</p>}
            <p className="text-sm font-medium leading-relaxed">{block.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function LessonView({
  module, lesson, isComplete, onComplete, onPrev, onNext, onBack,
}: {
  module: Module; lesson: Lesson; isComplete: boolean;
  onComplete: () => void; onPrev: (() => void) | null; onNext: (() => void) | null; onBack: () => void;
}) {
  async function handleComplete() {
    if (isComplete) return;
    onComplete();
    toast.success("Lesson marked complete!");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Academy
        </Button>
      </div>

      {/* Slide header */}
      <div className={`rounded-2xl bg-gradient-to-br ${module.gradient} border border-border/60 px-6 py-5`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{module.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{module.title}</p>
            <h1 className="text-2xl font-bold tracking-tight mt-0.5">{lesson.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-black/20 px-2.5 py-1 rounded-full">
            <Clock className="h-3.5 w-3.5" /> {lesson.estimatedMins} min read
          </div>
          {isComplete && (
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
            </Badge>
          )}
        </div>
      </div>

      {/* Slide content — each block is its own visual card */}
      <div className="space-y-3">
        {lesson.sections.map((block, i) => (
          <SlideBlock key={i} block={block} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <Button variant="outline" onClick={onPrev ?? (() => {})} disabled={!onPrev}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="flex gap-2">
          {!isComplete && (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Complete
            </Button>
          )}
          {onNext ? (
            <Button onClick={onNext}>
              Next Lesson <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="outline" onClick={onBack}>
              Back to Academy <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizView({ onComplete, onBack }: { onComplete: (r: QuizResult) => void; onBack: () => void }) {
  const [questions] = useState<QuizQuestion[]>(() => {
    const shuffled = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled;
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const { user } = useAuth();

  const q = questions[current];
  const answered = answers[q.id] !== undefined;
  const selected = answers[q.id];

  function choose(idx: number) {
    if (answered) return;
    setAnswers(prev => ({ ...prev, [q.id]: idx }));
  }

  async function finish() {
    const score = questions.filter(q => answers[q.id] === q.correct).length;
    const total = questions.length;
    const passed = score / total >= PASSING_SCORE;
    if (user?.id) {
      await supabase.from("mentoring_quiz_results" as any).insert({
        user_id: user.id, score, total, passed,
      });
    }
    onComplete({ score, total, passed });
  }

  const isLast = current === questions.length - 1;
  const allAnswered = Object.keys(answers).length === questions.length;

  const typeLabel = { mc: "Multiple Choice", tf: "True / False", scenario: "Scenario" };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Exit Quiz
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-amber-400" /> Final Assessment
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pass mark: 80% · {questions.length} questions</p>
        </div>
        <Badge variant="outline">{current + 1} / {questions.length}</Badge>
      </div>

      <Progress value={((current + 1) / questions.length) * 100} className="h-1.5" />

      <Card className="rounded-2xl bg-card/60 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{typeLabel[q.type]}</Badge>
        </div>
        <p className="text-base font-medium leading-relaxed">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            let cls = "border-border text-foreground hover:border-primary/50 hover:bg-white/5";
            if (answered) {
              if (i === q.correct) cls = "border-green-500/60 bg-green-500/10 text-green-300";
              else if (i === selected && i !== q.correct) cls = "border-red-500/60 bg-red-500/10 text-red-300";
              else cls = "border-border text-muted-foreground opacity-50";
            } else if (i === selected) {
              cls = "border-primary/60 bg-primary/10";
            }
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${cls}`}
              >
                <span className="h-6 w-6 rounded-full border border-current flex items-center justify-center text-xs flex-shrink-0 font-medium">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {answered && i === q.correct && <Check className="ml-auto h-4 w-4 text-green-400 flex-shrink-0" />}
                {answered && i === selected && i !== q.correct && <X className="ml-auto h-4 w-4 text-red-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">{q.explanation}</p>
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        {!isLast ? (
          <Button onClick={() => setCurrent(c => c + 1)} disabled={!answered}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={finish}
            disabled={!allAnswered}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
          >
            Submit Quiz <ClipboardCheck className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function QuizResultView({ result, onRetry, onDone }: { result: QuizResult; onRetry: () => void; onDone: () => void }) {
  const pct = Math.round((result.score / result.total) * 100);
  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <Card className={`rounded-2xl p-8 text-center space-y-4 ${
        result.passed
          ? "bg-green-500/10 border-green-500/30"
          : "bg-red-500/10 border-red-500/30"
      }`}>
        <div className="flex justify-center">
          {result.passed
            ? <Trophy className="h-14 w-14 text-yellow-400" />
            : <X className="h-14 w-14 text-red-400" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{result.passed ? "Quiz Passed!" : "Not Quite"}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {result.passed
              ? "Excellent work. You have demonstrated the knowledge required."
              : "You need 80% to pass. Review the modules and try again."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-6">
          <div>
            <p className="text-4xl font-bold">{pct}%</p>
            <p className="text-xs text-muted-foreground">Score</p>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{result.score} / {result.total} correct</p>
            <p className="text-xs text-muted-foreground">Pass mark: 80%</p>
          </div>
        </div>
        {result.passed && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-400 font-medium">
            <Star className="h-4 w-4" /> Mentoring Complete
          </div>
        )}
      </Card>
      <div className="flex gap-3 justify-center">
        {!result.passed && (
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Retry Quiz
          </Button>
        )}
        <Button onClick={onDone}>
          {result.passed ? <><Trophy className="h-4 w-4 mr-1.5" /> Back to Academy</> : "Back to Academy"}
        </Button>
      </div>
    </div>
  );
}

function AdminView({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<{ display_name: string; completed: number; passed: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: progress }, { data: quizResults }] = await Promise.all([
        supabase.from("profiles").select("id, display_name").eq("deactivated", false),
        supabase.from("mentoring_progress" as any).select("user_id, lesson_id"),
        supabase.from("mentoring_quiz_results" as any).select("user_id, passed"),
      ]);

      const completedMap: Record<string, number> = {};
      (progress ?? []).forEach((r: any) => {
        completedMap[r.user_id] = (completedMap[r.user_id] ?? 0) + 1;
      });

      const passedSet = new Set<string>(
        (quizResults ?? []).filter((r: any) => r.passed).map((r: any) => r.user_id)
      );

      setRows(
        (profiles ?? []).map((p: any) => ({
          display_name: p.display_name,
          userId: p.id,
          completed: completedMap[p.id] ?? 0,
          passed: passedSet.has(p.id),
        }))
      );
      setLoading(false);
    }
    load();
  }, []);

  async function resetProgress(userId: string, displayName: string) {
    if (!confirm(`Reset all mentoring progress for ${displayName}?`)) return;
    setResetting(userId);
    await Promise.all([
      supabase.from("mentoring_progress" as any).delete().eq("user_id", userId),
      supabase.from("mentoring_quiz_results" as any).delete().eq("user_id", userId),
    ]);
    setRows(prev => prev.map((r: any) =>
      r.userId === userId ? { ...r, completed: 0, passed: false } : r
    ));
    setResetting(null);
    toast.success(`Progress reset for ${displayName}`);
  }

  const completedAll = rows.filter((r: any) => r.completed >= TOTAL_LESSONS && r.passed).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Academy
        </Button>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Mentoring Admin
          </h1>
          <p className="text-sm text-muted-foreground">View staff progress and manage completion records.</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {completedAll} fully complete
        </Badge>
      </div>

      <Card className="rounded-2xl bg-card/60 p-3">
        {loading && <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>}
        <div className="divide-y divide-border">
          {(rows as any[]).map((r) => {
            const pct = TOTAL_LESSONS > 0 ? Math.round((r.completed / TOTAL_LESSONS) * 100) : 0;
            return (
              <div key={r.userId} className="flex items-center gap-4 py-3 px-2">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.display_name}</span>
                    {r.passed && (
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                        <Trophy className="h-3 w-3 mr-1" />Passed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 w-28" />
                    <span className="text-xs text-muted-foreground">{r.completed}/{TOTAL_LESSONS} lessons</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-red-400"
                  disabled={resetting === r.userId || (r.completed === 0 && !r.passed)}
                  onClick={() => resetProgress(r.userId, r.display_name)}
                >
                  {resetting === r.userId
                    ? <RotateCcw className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
