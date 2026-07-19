// apps/web/src/app/exam/[sessionId]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Clock, AlertTriangle, CheckCircle2, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/providers/socket-provider';
import api from '@/lib/api';

interface Question {
  id: string;
  question_text: string;
  question_type: 'MCQ' | 'ESSAY' | 'SHORT_ANSWER';
  options?: string[];
  marks: number;
}

export default function ExamSessionPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { socket } = useSocket();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // 1. Fetch Exam Data
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.get(`/cbt/sessions/${sessionId}`);
        setExam(res.data.exam);
        setQuestions(res.data.questions);
        // Initialize answers with existing data (for auto-save recovery)
        const initialAnswers: Record<string, string> = {};
        res.data.questions.forEach((q: Question) => {
          if (res.data.existing_answers?.[q.id]) initialAnswers[q.id] = res.data.existing_answers[q.id];
        });
        setAnswers(initialAnswers);
        
        // Calculate time left
        const endTime = new Date(res.data.exam.end_time).getTime();
        setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));
      } catch (error) {
        toast.error('Failed to load exam session.');
        router.push('/dashboard');
      }
    };
    if (sessionId) fetchExam();
  }, [sessionId, router]);

  // 2. Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // 3. ANTI-CHEAT HOOKS (Phase 6.4 Proctoring)
  useEffect(() => {
    const handleBlur = () => {
      if (socket) {
        socket.emit('cbt:proctoring_event', { sessionId, event_type: 'TAB_SWITCH', details: { timestamp: new Date() } });
      }
      toast.error('⚠️ WARNING: Tab switch detected! Do not leave the exam window.', { duration: 5000 });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleBlur();
    };

    // Prevent right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    // Prevent copy-paste
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
        toast.error('Copy/Paste is disabled during this exam.');
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionId, socket]);

  // 4. Auto-Save Logic (Debounced)
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (Object.keys(answers).length > 0) {
        try {
          await api.post(`/cbt/sessions/${sessionId}/auto-save`, { answers });
        } catch (e) {
          console.warn('Auto-save failed, will retry on next change or offline sync.');
        }
      }
    }, 3000); // Save 3 seconds after the user stops typing/clicking

    return () => clearTimeout(timeout);
  }, [answers, sessionId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });
  };

  const handleAutoSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/cbt/sessions/${sessionId}/submit`, { answers });
      toast.success('Exam auto-submitted (Time expired).');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to submit exam. Please check your connection.');
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post(`/cbt/sessions/${sessionId}/submit`, { answers });
      toast.success('Exam submitted successfully!');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Failed to submit exam.');
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!exam) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin" /></div>;

  const currentQ = questions[currentQIndex];
  const answeredCount = Object.values(answers).filter(a => a && a.trim() !== '').length;
  const isUrgent = timeLeft < 300; // Less than 5 minutes

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Top Bar: Timer & Progress */}
      <header className={`h-16 px-6 flex items-center justify-between shadow-md ${isUrgent ? 'bg-red-600 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg truncate">{exam.title}</h1>
          <Badge variant="outline" className={isUrgent ? 'border-white text-white' : ''}>
            {answeredCount} / {questions.length} Answered
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xl font-mono font-bold">
          <Clock className="h-5 w-5" />
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Navigator (Sidebar) */}
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto hidden md:block">
          <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase">Question Navigator</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] && answers[q.id].trim() !== '';
              const isFlagged = flagged.has(q.id);
              const isCurrent = idx === currentQIndex;
              
              let bgColor = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
              if (isCurrent) bgColor = 'bg-blue-600 text-white ring-2 ring-blue-300';
              else if (isFlagged) bgColor = 'bg-yellow-400 text-yellow-900';
              else if (isAnswered) bgColor = 'bg-green-500 text-white';

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-9 w-9 rounded flex items-center justify-center text-xs font-bold transition ${bgColor}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-6 space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-500"></span> Answered</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-yellow-400"></span> Flagged for Review</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-gray-200"></span> Unanswered</div>
          </div>
        </aside>

        {/* Question Display Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Card className="max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline">Question {currentQIndex + 1} of {questions.length} ({currentQ.marks} Marks)</Badge>
                <Button 
                  variant={flagged.has(currentQ.id) ? 'default' : 'outline'} 
                  size="sm" 
                  className={flagged.has(currentQ.id) ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                  onClick={() => toggleFlag(currentQ.id)}
                >
                  <Flag className="mr-2 h-4 w-4" /> {flagged.has(currentQ.id) ? 'Flagged' : 'Flag for Review'}
                </Button>
              </div>

              <h2 className="text-xl font-semibold mb-6 whitespace-pre-wrap">{currentQ.question_text}</h2>

              {/* Answer Input based on Type */}
              {currentQ.question_type === 'MCQ' && currentQ.options && (
                <div className="space-y-3">
                  {currentQ.options.map((opt, idx) => (
                    <label key={idx} className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${answers[currentQ.id] === opt ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <input
                        type="radio"
                        name={`q-${currentQ.id}`}
                        value={opt}
                        checked={answers[currentQ.id] === opt}
                        onChange={() => handleAnswerChange(currentQ.id, opt)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-3 font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {(currentQ.question_type === 'SHORT_ANSWER' || currentQ.question_type === 'ESSAY') && (
                <textarea
                  className="w-full min-h-[200px] p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={currentQ.question_type === 'ESSAY' ? 'Write your essay here...' : 'Short answer...'}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0}>
                  Previous
                </Button>
                
                {currentQIndex === questions.length - 1 ? (
                  <Button onClick={() => setShowConfirmSubmit(true)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Finish & Submit
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentQIndex(Math.min(questions.length - 1, currentQIndex + 1))}>
                    Next
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-yellow-500" /> Submit Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions. 
            {flagged.size > 0 && <span className="text-yellow-600 block mt-2">You have {flagged.size} question(s) flagged for review.</span>}
            <br /><br />Are you sure you want to submit? You cannot change your answers after submission.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>Review Answers</Button>
            <Button onClick={handleManualSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null} Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}