import { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Moon, Droplets, Brain, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function StatCard({ icon: Icon, label, value, subtitle, color }) {
  return (
    <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl bg-white" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8A8887] mb-1">{label}</p>
            <p className="text-2xl font-semibold text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {value ?? "--"}
            </p>
            {subtitle && <p className="text-xs text-[#8A8887] mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ insight, index }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-2xl bg-[#F9F6F0] border border-[#F4AAB9]/10 animate-fade-in"
      style={{ animationDelay: `${index * 0.1}s` }}
      data-testid="insight-card"
    >
      <AlertCircle className="w-4 h-4 text-[#F4AAB9] mt-0.5 flex-shrink-0" strokeWidth={1.5} />
      <p className="text-sm text-[#2C2A29] leading-relaxed">{insight}</p>
    </div>
  );
}

function FrequencyBar({ label, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[#5C5A59] w-28 truncate">{label}</span>
      <div className="flex-1">
        <Progress value={pct} className="h-2 [&>div]:bg-[#F4AAB9]" />
      </div>
      <span className="text-xs font-medium text-[#8A8887] w-6 text-right">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, patternsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/patterns`),
      ]);
      setStats(statsRes.data);
      setPatterns(patternsRes.data);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const symptomEntries = patterns ? Object.entries(patterns.symptom_frequency) : [];
  const moodEntries = patterns ? Object.entries(patterns.mood_frequency) : [];
  const maxSymptom = symptomEntries.length > 0 ? Math.max(...symptomEntries.map(([, v]) => v)) : 1;
  const maxMood = moodEntries.length > 0 ? Math.max(...moodEntries.map(([, v]) => v)) : 1;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-[#2C2A29] tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="dashboard-header">
            Health Dashboard
          </h2>
          <p className="text-sm text-[#8A8887] mt-1">Your weekly health overview</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={refreshing}
          className="rounded-full border-[#F4AAB9]/25 hover:bg-[#F4AAB9]/8 text-[#5C5A59]"
          data-testid="dashboard-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Entries"
          value={stats?.entries_7d ?? 0}
          subtitle="This week"
          color="bg-[#F4AAB9]/15 text-[#F4AAB9]"
        />
        <StatCard
          icon={Moon}
          label="Avg Sleep"
          value={stats?.avg_sleep_7d ? `${stats.avg_sleep_7d}h` : "--"}
          subtitle="This week"
          color="bg-[#A8C3A6]/15 text-[#A8C3A6]"
        />
        <StatCard
          icon={TrendingUp}
          label="Symptoms"
          value={stats?.unique_symptoms_7d ?? 0}
          subtitle="Unique this week"
          color="bg-[#FCD8B8]/40 text-[#E07A5F]"
        />
        <StatCard
          icon={Brain}
          label="Messages"
          value={stats?.total_messages ?? 0}
          subtitle="All time"
          color="bg-[#9CB4D4]/15 text-[#9CB4D4]"
        />
      </div>

      {/* Insights */}
      {patterns?.insights && patterns.insights.length > 0 && (
        <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl" data-testid="insights-section">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Health Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} index={i} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Symptom & Mood Tabs */}
      <Tabs defaultValue="symptoms" className="w-full" data-testid="frequency-tabs">
        <TabsList className="bg-[#F9F6F0] rounded-full p-1 mb-4">
          <TabsTrigger value="symptoms" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2C2A29] text-[#8A8887] text-sm">
            Symptoms
          </TabsTrigger>
          <TabsTrigger value="moods" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-[#2C2A29] text-[#8A8887] text-sm">
            Moods
          </TabsTrigger>
        </TabsList>

        <TabsContent value="symptoms">
          <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Symptom Frequency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {symptomEntries.length > 0 ? (
                symptomEntries
                  .sort(([, a], [, b]) => b - a)
                  .map(([symptom, count]) => (
                    <FrequencyBar key={symptom} label={symptom} count={count} maxCount={maxSymptom} />
                  ))
              ) : (
                <p className="text-sm text-[#8A8887] text-center py-8">No symptoms recorded yet. Start chatting to track.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moods">
          <Card className="border-[#F4AAB9]/15 shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Mood Frequency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {moodEntries.length > 0 ? (
                moodEntries
                  .sort(([, a], [, b]) => b - a)
                  .map(([mood, count]) => (
                    <FrequencyBar key={mood} label={mood} count={count} maxCount={maxMood} />
                  ))
              ) : (
                <p className="text-sm text-[#8A8887] text-center py-8">No mood data yet. Share how you feel in the chat.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
