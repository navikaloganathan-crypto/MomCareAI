import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Bell, Check, X, Clock, Pill, Heart, RefreshCw,
  ChevronRight, AlertCircle, Plus, Trash2, TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function AmmaMessage({ message, type = "info" }) {
  if (!message) return null;
  const bgMap = {
    info: "bg-[#F4AAB9]/8 border-[#F4AAB9]/20",
    success: "bg-[#A8C3A6]/10 border-[#A8C3A6]/25",
    warning: "bg-[#FCD8B8]/20 border-[#FCD8B8]/40",
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${bgMap[type] || bgMap.info} animate-fade-in`}
      data-testid="amma-message"
    >
      <div className="w-8 h-8 rounded-full bg-[#F4AAB9]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Heart className="w-4 h-4 text-[#F4AAB9]" strokeWidth={2} />
      </div>
      <p className="text-sm text-[#2C2A29] leading-relaxed">{message}</p>
    </div>
  );
}

function ReminderItem({ reminder, onTaken, onSkipped, onDelete }) {
  const [ammaMsg, setAmmaMsg] = useState(null);
  const [ammaType, setAmmaType] = useState("info");

  const handleAction = async (status) => {
    try {
      const res = await axios.post(`${API}/reminder/${reminder.id}/log`, { status });
      setAmmaMsg(res.data.message);
      setAmmaType(status === "taken" ? "success" : "warning");
      if (status === "taken") onTaken?.(reminder.id);
      else onSkipped?.(reminder.id);
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  // Count today's logs
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLog = reminder.logs?.find((l) => l.timestamp?.startsWith(todayStr));

  return (
    <Card
      className="border-[#F4AAB9]/15 shadow-sm rounded-2xl overflow-hidden"
      data-testid={`reminder-item-${reminder.id}`}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-4 p-5">
          {/* Time */}
          <div className="w-14 h-14 rounded-2xl bg-[#F4AAB9]/10 flex flex-col items-center justify-center flex-shrink-0 border border-[#F4AAB9]/15">
            <Clock className="w-3.5 h-3.5 text-[#F4AAB9] mb-0.5" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-[#F4AAB9]">{reminder.time}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-[#2C2A29] truncate">{reminder.medicine}</h4>
              {reminder.dosage && (
                <Badge variant="outline" className="text-[10px] border-[#A8C3A6]/30 text-[#5C5A59] bg-[#A8C3A6]/8 rounded-full flex-shrink-0">
                  {reminder.dosage}
                </Badge>
              )}
            </div>
            {reminder.notes && (
              <p className="text-xs text-[#8A8887] truncate">{reminder.notes}</p>
            )}
            {todayLog && (
              <Badge className={`text-[10px] mt-1 border-0 rounded-full ${
                todayLog.status === "taken"
                  ? "bg-[#A8C3A6]/15 text-[#A8C3A6]"
                  : "bg-[#E07A5F]/10 text-[#E07A5F]"
              }`}>
                {todayLog.status === "taken" ? "Taken today" : "Skipped today"}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!todayLog ? (
              <>
                <Button
                  size="sm"
                  onClick={() => handleAction("taken")}
                  className="h-9 rounded-full bg-[#A8C3A6] hover:bg-[#95b593] text-white text-xs px-4"
                  data-testid={`reminder-take-${reminder.id}`}
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Taken
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("skipped")}
                  className="h-9 rounded-full border-[#E07A5F]/25 text-[#E07A5F] hover:bg-[#E07A5F]/8 text-xs px-3"
                  data-testid={`reminder-skip-${reminder.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete?.(reminder.id)}
                className="h-8 w-8 p-0 text-[#8A8887] hover:text-[#E07A5F] hover:bg-[#E07A5F]/8"
                data-testid={`reminder-delete-${reminder.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {ammaMsg && (
          <div className="px-5 pb-4">
            <AmmaMessage message={ammaMsg} type={ammaType} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddReminderDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!medicine.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/reminder`, {
        medicine: medicine.trim(),
        dosage: dosage.trim() || null,
        time,
        frequency: "daily",
      });
      onAdd?.();
      setMedicine("");
      setDosage("");
      setTime("08:00");
      setOpen(false);
    } catch (e) {
      console.error("Failed to add reminder", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-full bg-[#F4AAB9] hover:bg-[#f09aad] text-white"
          data-testid="add-reminder-button"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-[#F4AAB9]/20 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Add Medicine Reminder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-[#5C5A59] mb-1.5 block">Medicine Name</label>
            <Input
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              placeholder="e.g., Paracetamol"
              className="rounded-xl border-[#F4AAB9]/20 text-sm"
              data-testid="reminder-medicine-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5C5A59] mb-1.5 block">Dosage (optional)</label>
            <Input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500mg"
              className="rounded-xl border-[#F4AAB9]/20 text-sm"
              data-testid="reminder-dosage-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#5C5A59] mb-1.5 block">Time</label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="rounded-xl border-[#F4AAB9]/20 text-sm" data-testid="reminder-time-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="07:30">07:30 - Before Breakfast</SelectItem>
                <SelectItem value="08:00">08:00 - Morning</SelectItem>
                <SelectItem value="13:00">13:00 - Afternoon</SelectItem>
                <SelectItem value="13:30">13:30 - After Lunch</SelectItem>
                <SelectItem value="18:00">18:00 - Evening</SelectItem>
                <SelectItem value="20:00">20:00 - Night</SelectItem>
                <SelectItem value="21:00">21:00 - Before Bed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!medicine.trim() || loading}
            className="w-full rounded-full bg-[#F4AAB9] hover:bg-[#f09aad] text-white"
            data-testid="reminder-save-button"
          >
            {loading ? "Saving..." : "Save Reminder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [adherence, setAdherence] = useState(null);
  const [dueReminders, setDueReminders] = useState([]);
  const [greeting, setGreeting] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [remRes, adhRes, checkRes] = await Promise.all([
        axios.get(`${API}/reminder`),
        axios.get(`${API}/reminder/adherence`),
        axios.get(`${API}/reminder/check`),
      ]);
      setReminders(remRes.data.reminders || []);
      setAdherence(adhRes.data);
      setDueReminders(checkRes.data.due || []);
    } catch (e) {
      console.error("Failed to load reminders", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Get Amma greeting
    axios.post(`${API}/reminder/amma`, { action: "greeting" })
      .then((res) => setGreeting(res.data.message))
      .catch(() => {});
  }, [fetchData]);

  // Poll for due reminders every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/reminder/check`);
        setDueReminders(res.data.due || []);
      } catch (e) { /* ignore */ }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/reminder/${id}`);
      fetchData();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const healthCheck = async () => {
    try {
      const res = await axios.post(`${API}/reminder/amma`, { action: "follow_up" });
      setGreeting(res.data.message);
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#2C2A29] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="reminders-header">
            Medicine Reminders
          </h2>
          <p className="text-sm text-[#8A8887] mt-1">Amma AI keeps you on track with your medicines</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="rounded-full border-[#F4AAB9]/25 hover:bg-[#F4AAB9]/8 text-[#5C5A59]"
            data-testid="reminders-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <AddReminderDialog onAdd={fetchData} />
        </div>
      </div>

      {/* Amma Greeting */}
      {greeting && <AmmaMessage message={greeting} type="info" />}

      {/* Due Reminders Alert */}
      {dueReminders.length > 0 && (
        <Card className="border-[#F4AAB9]/25 shadow-md rounded-2xl bg-[#F4AAB9]/5 animate-fade-in" data-testid="due-reminders-alert">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-[#F4AAB9]" />
              <h3 className="text-base font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Medicines Due Now
              </h3>
            </div>
            {dueReminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 mb-2 rounded-xl bg-white border border-[#F4AAB9]/15">
                <div className="flex items-center gap-3">
                  <Pill className="w-4 h-4 text-[#F4AAB9]" />
                  <div>
                    <p className="text-sm font-medium text-[#2C2A29]">{r.medicine}</p>
                    {r.amma_message && <p className="text-xs text-[#8A8887]">{r.amma_message}</p>}
                  </div>
                </div>
                <Badge className="bg-[#F4AAB9]/15 text-[#F4AAB9] border-0 text-xs rounded-full">
                  {r.time}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="reminders" className="w-full" data-testid="reminders-tabs">
        <TabsList className="bg-[#F9F6F0] rounded-full p-1 mb-4">
          <TabsTrigger value="reminders" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2C2A29] text-[#8A8887] text-sm">
            My Reminders
          </TabsTrigger>
          <TabsTrigger value="adherence" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2C2A29] text-[#8A8887] text-sm">
            Adherence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-3">
          {loading && (
            <div className="text-center py-12">
              <RefreshCw className="w-6 h-6 mx-auto text-[#F4AAB9] animate-spin mb-2" />
              <p className="text-sm text-[#8A8887]">Loading reminders...</p>
            </div>
          )}

          {!loading && reminders.length === 0 && (
            <div className="text-center py-16" data-testid="reminders-empty">
              <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-[#F4AAB9]/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-[#F4AAB9]/50" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-medium text-[#2C2A29] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                No reminders yet
              </h3>
              <p className="text-sm text-[#8A8887] max-w-xs mx-auto">
                Add reminders manually or analyze a prescription to auto-create them.
              </p>
            </div>
          )}

          {!loading && reminders.map((r) => (
            <ReminderItem
              key={r.id}
              reminder={r}
              onTaken={fetchData}
              onSkipped={fetchData}
              onDelete={handleDelete}
            />
          ))}
        </TabsContent>

        <TabsContent value="adherence">
          {adherence ? (
            <div className="space-y-4">
              {/* Overall Rate */}
              <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl" data-testid="adherence-overall">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A8887]">Overall Adherence</p>
                      <p className="text-3xl font-semibold text-[#2C2A29] mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {adherence.overall_rate}%
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      adherence.overall_rate >= 80 ? "bg-[#A8C3A6]/15" : adherence.overall_rate >= 50 ? "bg-[#FCD8B8]/25" : "bg-[#E07A5F]/10"
                    }`}>
                      <TrendingUp className={`w-6 h-6 ${
                        adherence.overall_rate >= 80 ? "text-[#A8C3A6]" : adherence.overall_rate >= 50 ? "text-[#F4D06F]" : "text-[#E07A5F]"
                      }`} />
                    </div>
                  </div>
                  <Progress
                    value={adherence.overall_rate}
                    className={`h-3 rounded-full [&>div]:rounded-full ${
                      adherence.overall_rate >= 80 ? "[&>div]:bg-[#A8C3A6]" : adherence.overall_rate >= 50 ? "[&>div]:bg-[#F4D06F]" : "[&>div]:bg-[#E07A5F]"
                    }`}
                  />
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-2 rounded-xl bg-[#A8C3A6]/10">
                      <p className="text-lg font-semibold text-[#2C2A29]">{adherence.total_taken}</p>
                      <p className="text-[10px] text-[#8A8887]">Taken</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#E07A5F]/8">
                      <p className="text-lg font-semibold text-[#2C2A29]">{adherence.total_skipped}</p>
                      <p className="text-[10px] text-[#8A8887]">Skipped</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-[#F9F6F0]">
                      <p className="text-lg font-semibold text-[#2C2A29]">{adherence.period_days}d</p>
                      <p className="text-[10px] text-[#8A8887]">Period</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Amma feedback */}
              {adherence.amma_message && (
                <AmmaMessage
                  message={adherence.amma_message}
                  type={adherence.overall_rate >= 80 ? "success" : "warning"}
                />
              )}

              {/* Per-medicine breakdown */}
              {Object.entries(adherence.medicine_adherence).length > 0 && (
                <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl" data-testid="adherence-breakdown">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Per Medicine
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(adherence.medicine_adherence).map(([name, data]) => (
                      <div key={name} className="flex items-center gap-3">
                        <Pill className="w-4 h-4 text-[#F4AAB9] flex-shrink-0" strokeWidth={1.5} />
                        <span className="text-sm text-[#2C2A29] w-32 truncate">{name}</span>
                        <div className="flex-1">
                          <Progress
                            value={data.rate}
                            className="h-2 [&>div]:bg-[#F4AAB9]"
                          />
                        </div>
                        <span className="text-xs font-medium text-[#8A8887] w-10 text-right">{data.rate}%</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Health check button */}
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={healthCheck}
                  className="rounded-full border-[#F4AAB9]/25 hover:bg-[#F4AAB9]/8 text-[#5C5A59]"
                  data-testid="health-check-button"
                >
                  <Heart className="w-4 h-4 mr-2 text-[#F4AAB9]" /> Ask Amma for a check-in
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-[#8A8887]">No adherence data yet. Start logging your medicines!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-2xl bg-[#F4D06F]/10 border border-[#F4D06F]/20">
        <AlertCircle className="w-3.5 h-3.5 text-[#F4D06F] mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-[#5C5A59] leading-relaxed">
          This is not medical advice. Please follow your doctor's instructions.
        </p>
      </div>
    </div>
  );
}
