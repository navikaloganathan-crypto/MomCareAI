import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Pill, Clock, AlertCircle, Loader2, Sparkles, ChevronRight, Bell, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function MedicineCard({ medicine, index }) {
  return (
    <Card
      className="border-[#F4AAB9]/15 shadow-sm rounded-2xl animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
      data-testid={`medicine-card-${index}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F4AAB9]/15 flex items-center justify-center">
              <Pill className="w-4 h-4 text-[#F4AAB9]" strokeWidth={1.5} />
            </div>
            <h4 className="text-base font-medium text-[#2C2A29]">{medicine.name || "Unknown"}</h4>
          </div>
          {medicine.dosage && medicine.dosage !== "Not specified" && (
            <Badge variant="outline" className="text-xs border-[#A8C3A6]/30 text-[#5C5A59] bg-[#A8C3A6]/10 rounded-full">
              {medicine.dosage}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {medicine.frequency && medicine.frequency !== "Not specified" && (
            <div>
              <p className="text-xs text-[#8A8887] mb-0.5">Frequency</p>
              <p className="text-[#2C2A29]">{medicine.frequency}</p>
            </div>
          )}
          {medicine.duration && medicine.duration !== "Not specified" && (
            <div>
              <p className="text-xs text-[#8A8887] mb-0.5">Duration</p>
              <p className="text-[#2C2A29]">{medicine.duration}</p>
            </div>
          )}
        </div>

        {medicine.timing?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {medicine.timing.map((t) => (
              <Badge key={t} className="text-xs bg-[#FCD8B8]/30 text-[#5C5A59] border-0 rounded-full">
                <Clock className="w-3 h-3 mr-1" />{t}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderCard({ reminder, index }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-[#F9F6F0] border border-[#F4AAB9]/10 animate-fade-in"
      style={{ animationDelay: `${index * 0.08}s` }}
      data-testid={`reminder-card-${index}`}
    >
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-[#F4AAB9]/15 flex-shrink-0">
        <span className="text-sm font-semibold text-[#F4AAB9]">{reminder.time}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2C2A29] truncate">{reminder.medicine}</p>
        <p className="text-xs text-[#8A8887] truncate">{reminder.message}</p>
      </div>
    </div>
  );
}

export default function PrescriptionPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remindersSaved, setRemindersSaved] = useState(false);
  const navigate = useNavigate();

  const analyzePrescription = async () => {
    if (!text.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setRemindersSaved(false);

    try {
      const res = await axios.post(`${API}/prescription/analyze`, { text: text.trim() });
      setResult(res.data);
      // Reminders are auto-created by backend
      if (res.data.reminders?.length > 0) {
        setRemindersSaved(true);
      }
    } catch (e) {
      console.error("Prescription analysis failed", e);
      setError("Failed to analyze prescription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const samplePrescription = `Tab Paracetamol 500mg - twice daily after food for 5 days
Tab Cetirizine 10mg - once at night for 7 days
Syrup Amoxicillin 250mg/5ml - 5ml three times daily for 5 days`;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-medium text-[#2C2A29] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="prescription-header">
          Prescription Analyzer
        </h2>
        <p className="text-sm text-[#8A8887] mt-1">
          Paste your prescription text and get simple, clear instructions
        </p>
      </div>

      {/* Input */}
      <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl" data-testid="prescription-input-card">
        <CardContent className="p-6 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your prescription here..."
            rows={6}
            className="border-[#F4AAB9]/20 rounded-xl focus-visible:ring-[#F4AAB9]/30 text-sm text-[#2C2A29] placeholder:text-[#8A8887] resize-none"
            data-testid="prescription-textarea"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={() => setText(samplePrescription)}
              className="text-xs text-[#F4AAB9] hover:text-[#f09aad] transition-colors flex items-center gap-1"
              data-testid="prescription-sample-button"
            >
              <Sparkles className="w-3 h-3" /> Try sample prescription
            </button>
            <Button
              onClick={analyzePrescription}
              disabled={!text.trim() || loading}
              className="rounded-full bg-[#F4AAB9] hover:bg-[#f09aad] text-white px-6"
              data-testid="prescription-analyze-button"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  Analyze <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-[#E07A5F]/10 border border-[#E07A5F]/20" data-testid="prescription-error">
          <AlertCircle className="w-4 h-4 text-[#E07A5F]" />
          <p className="text-sm text-[#E07A5F]">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Medicines */}
          {result.medicines?.length > 0 && (
            <div className="space-y-3" data-testid="prescription-medicines">
              <h3 className="text-lg font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Medicines Found
              </h3>
              {result.medicines.map((med, i) => (
                <MedicineCard key={i} medicine={med} index={i} />
              ))}
            </div>
          )}

          {/* Explanation */}
          {result.explanation && (
            <Card className="border-[#A8C3A6]/20 shadow-sm rounded-2xl bg-[#A8C3A6]/5" data-testid="prescription-explanation">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-[#2C2A29]">
                  How to Take Your Medicines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5C5A59] leading-relaxed whitespace-pre-line">{result.explanation}</p>
              </CardContent>
            </Card>
          )}

          {/* Reminders saved banner */}
          {remindersSaved && (
            <Card className="border-[#A8C3A6]/25 shadow-sm rounded-2xl bg-[#A8C3A6]/8 animate-fade-in" data-testid="reminders-saved-banner">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#A8C3A6]/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#A8C3A6]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2C2A29]">Reminders auto-created!</p>
                    <p className="text-xs text-[#5C5A59]">Amma AI will remind you to take your medicines on time.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/reminders")}
                  className="rounded-full border-[#A8C3A6]/30 text-[#5C5A59] hover:bg-[#A8C3A6]/10"
                  data-testid="go-to-reminders-button"
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5" /> View Reminders
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Reminders */}
          {result.reminders?.length > 0 && (
            <div data-testid="prescription-reminders">
              <h3 className="text-lg font-medium text-[#2C2A29] mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Reminders
              </h3>
              <div className="space-y-2">
                {result.reminders.map((rem, i) => (
                  <ReminderCard key={i} reminder={rem} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-4 rounded-2xl bg-[#F4D06F]/10 border border-[#F4D06F]/20" data-testid="prescription-disclaimer">
            <AlertCircle className="w-4 h-4 text-[#F4D06F] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#5C5A59] leading-relaxed">
              {result.disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="text-center py-12" data-testid="prescription-empty">
          <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#F4AAB9]/10 flex items-center justify-center">
            <Pill className="w-8 h-8 text-[#F4AAB9]/50" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-[#8A8887]">
            Paste your prescription above to get started
          </p>
        </div>
      )}
    </div>
  );
}
