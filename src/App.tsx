import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutDashboard, UserRound, LineChart, Bot, Menu } from 'lucide-react';
import { 
  CrewMember, 
  HealthReading, 
  HealthAlert, 
  HealthEvent, 
  ImportedDataset, 
  MissionSettings,
  ResearchStudy,
  MovementAssessment
} from './types/astramed';
import { DEFAULT_MISSION_SETTINGS } from './utils/alertEngine';
import { TopStatusBar } from './components/TopStatusBar';
import { Sidebar, NavSection } from './components/Sidebar';
import { MissionOverview } from './views/MissionOverview';
import { CrewBodyMonitor } from './views/CrewBodyMonitor';
import { HealthTrends } from './views/HealthTrends';
import { AIAssistant } from './views/AIAssistant';
import { ResearchLibrary } from './views/ResearchLibrary';
import { DataImporter } from './views/DataImporter';
import { EnterReadings } from './views/EnterReadings';
import { SettingsView } from './views/SettingsView';
import { CrewComparisonModal } from './views/CrewComparisonModal';
import { EnvironmentMonitorModal } from './views/EnvironmentMonitorModal';
import { MissionReportModal } from './views/MissionReportModal';
import { AlertsCenterModal } from './views/AlertsCenterModal';
import { YomaMovement } from './views/YomaMovement';
import { CrewProfiles } from './views/CrewProfiles';
import { VirtualSmartwatch } from './views/VirtualSmartwatch';
import { WearableStartGate } from './components/WearableStartGate';
import { MrsSpaceGuide } from './components/MrsSpaceGuide';
import { DEMO_ALERTS, DEMO_CREW, DEMO_EVENTS, DEMO_READINGS } from './utils/demoData';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [importedDatasets, setImportedDatasets] = useState<ImportedDataset[]>([]);
  const [movementAssessments, setMovementAssessments] = useState<MovementAssessment[]>([]);
  const [settings, setSettings] = useState<MissionSettings>(DEFAULT_MISSION_SETTINGS);
  const [isGeminiActive, setIsGeminiActive] = useState<boolean>(false);
  const [sensorIngestConfigured, setSensorIngestConfigured] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [showWearableStartGate, setShowWearableStartGate] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [selectedDemoCrewId, setSelectedDemoCrewId] = useState<string>(DEMO_CREW[0].id);

  const displayCrewList = isDemoMode ? DEMO_CREW : crewList;
  const displayReadings = isDemoMode ? DEMO_READINGS : readings;
  const displayAlerts = isDemoMode ? DEMO_ALERTS : alerts;
  const displayEvents = isDemoMode ? DEMO_EVENTS : events;
  const displaySelectedCrew = isDemoMode ? (DEMO_CREW.find(crew => crew.id === selectedDemoCrewId) || DEMO_CREW[0]) : selectedCrew;
  const demoAllowedSections: NavSection[] = ['overview', 'crew_body', 'trends', 'ai_assistant', 'research'];
  const navigateSection = (section: NavSection) => { if (isDemoMode && !demoAllowedSections.includes(section)) return; setActiveSection(section); };
  const toggleDemoMode = () => { setIsDemoMode(current => !current); setActiveSection('overview'); setSelectedDemoCrewId(DEMO_CREW[0].id); setIsAlertsOpen(false); setIsComparisonOpen(false); setIsReportOpen(false); };

  // Modals state
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isEnvironmentOpen, setIsEnvironmentOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Cross-component prompt passing (e.g. from Research Library to AI Assistant)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [aiSelectedStudy, setAiSelectedStudy] = useState<ResearchStudy | null>(null);
  const [researchCategoryFilter, setResearchCategoryFilter] = useState<string | undefined>(undefined);

  // Fetch all mission data
  const fetchData = useCallback(async () => {
    try {
      const [
        crewRes, 
        readingsRes, 
        alertsRes, 
        eventsRes, 
        datasetsRes, 
        settingsRes, 
        healthRes,
        movementRes
      ] = await Promise.all([
        fetch('/api/crew'),
        fetch('/api/readings'),
        fetch('/api/alerts'),
        fetch('/api/events'),
        fetch('/api/datasets'),
        fetch('/api/settings'),
        fetch('/api/health'),
        fetch('/api/movement-assessments')
      ]);

      if (crewRes.ok) {
        const crewData = await crewRes.json();
        setCrewList(crewData);
        if (!selectedCrew && crewData.length > 0) {
          setSelectedCrew(crewData[0]);
        }
      }

      if (readingsRes.ok) {
        const readingsData = await readingsRes.json();
        setReadings(readingsData);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      }

      if (datasetsRes.ok) {
        const datasetsData = await datasetsRes.json();
        setImportedDatasets(datasetsData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData && settingsData.missionName) {
          setSettings(settingsData);
        }
      }

      if (movementRes.ok) {
        setMovementAssessments(await movementRes.json());
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setIsGeminiActive(Boolean(healthData.geminiConfigured));
        setSensorIngestConfigured(Boolean(healthData.sensorIngestConfigured));
      }
    } catch (err) {
      console.error('Error fetching ASTRAMED data:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [selectedCrew]);

  useEffect(() => {
    fetchData();
  }, []);

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<MissionSettings>) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  // Clear all imported data
  const handleClearAllImported = async () => {
    try {
      const res = await fetch('/api/datasets', { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to clear imported datasets:', err);
    }
  };

  // Delete single dataset
  const handleDeleteDataset = async (id: string) => {
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  // AI Assistant Action Execution Handler
  const handleExecuteAction = (action: { type: string; targetSection?: string; params?: Record<string, string> }) => {
    if (action.targetSection) {
      const sectionMap: Record<string, NavSection> = {
        overview: 'overview',
        crew_body: 'crew_body',
        trends: 'trends',
        ai_assistant: 'ai_assistant',
        research: 'research',
        importer: 'importer',
        enter_readings: 'enter_readings',
        settings: 'settings',
        yoma: 'yoma',
        crew_profiles: 'crew_profiles',
        smartwatch: 'smartwatch'
      };
      if (sectionMap[action.targetSection]) {
        navigateSection(sectionMap[action.targetSection]);
      }
    }

    if (action.params?.crewId) {
      const target = displayCrewList.find(c => c.id === action.params?.crewId);
      if (target) {
        if (isDemoMode) setSelectedDemoCrewId(target.id); else setSelectedCrew(target);
      }
    }

    if (action.params?.category) {
      setResearchCategoryFilter(action.params.category);
    }
  };

  // Navigate to Research from Body Map
  const handleOpenResearchFromModel = (category: string) => {
    setResearchCategoryFilter(category);
    navigateSection('research');
  };

  // Navigate to AI Assistant with initial prompt
  const handleAskAIFromStudy = (prompt: string, study?: ResearchStudy) => {
    setAiSelectedStudy(study || null);
    setAiInitialPrompt(prompt);
    navigateSection('ai_assistant');
  };

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {!isLoadingInitial && showWearableStartGate && (
        <WearableStartGate
          onConnect={() => { setActiveSection('smartwatch'); setShowWearableStartGate(false); }}
          onVirtual={() => { setActiveSection('smartwatch'); setShowWearableStartGate(false); }}
          onContinue={() => setShowWearableStartGate(false)}
        />
      )}

      {/* Left Mission Navigation Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={section => {
          navigateSection(section);
          setIsMobileNavOpen(false);
        }}
        alertCount={displayAlerts.length}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Friendly onboarding guide sits above the mission controls. */}
        <MrsSpaceGuide activeSection={activeSection} onNavigate={section => navigateSection(section)} />

        {/* Top Mission Status Bar */}
        <TopStatusBar
          missionName={isDemoMode ? 'ASTRAMED DEMO MISSION' : settings.missionName}
          missionStartDate={settings.missionStartDate}
          crewList={displayCrewList}
          selectedCrew={displaySelectedCrew}
          onSelectCrew={crew => isDemoMode ? setSelectedDemoCrewId(crew.id) : setSelectedCrew(crew)}
          alerts={displayAlerts}
          isGeminiActive={isGeminiActive}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenComparison={() => setIsComparisonOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenEnvironment={() => setIsEnvironmentOpen(true)}
          onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
          onOpenCamera={() => navigateSection('yoma')}
          onOpenNeckband={() => navigateSection('smartwatch')}
          onOpenDevices={() => navigateSection('smartwatch')}
        />

        <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 ${isDemoMode ? 'border-amber-700/60 bg-amber-950/70' : 'border-cyan-900/50 bg-slate-900/70'}`}><div className={`flex items-center gap-2 text-xs ${isDemoMode ? 'text-amber-100' : 'text-slate-300'}`}><span className={`rounded px-2 py-1 text-[10px] font-black tracking-wider ${isDemoMode ? 'bg-amber-500 text-slate-950' : 'bg-cyan-950 text-cyan-200 border border-cyan-800'}`}>{isDemoMode ? 'DEMO MODE' : 'MISSION MODE'}</span><span className="font-semibold">{isDemoMode ? 'SIMULATED DATA — NOT LIVE SENSOR TELEMETRY' : 'Live mission workspace'}</span><span className="hidden sm:inline opacity-70">{isDemoMode ? 'Fictional crew and readings. Nothing is saved to the mission database.' : 'Switch to isolated sample data for a safe product demonstration.'}</span></div><button onClick={toggleDemoMode} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${isDemoMode ? 'border-amber-500/50 bg-slate-950/70 text-amber-100 hover:bg-amber-900/60' : 'border-cyan-700 bg-cyan-950/60 text-cyan-200 hover:bg-cyan-900/60'}`}>{isDemoMode ? 'Exit Demo Mode' : 'Launch Demo Mode'}</button></div>
        {/* View Content Area */}
        <main className="astramed-workspace flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 pb-24 md:pb-6 min-h-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/60">
          {isLoadingInitial ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-cyan-400 font-mono text-xs">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <div>SYNCHRONIZING ASTRAMED TELEMETRY STREAM...</div>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeSection}
                className="min-h-full"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
              {activeSection === 'overview' && (
                <MissionOverview
                  crewList={displayCrewList}
                  readings={displayReadings}
                  alerts={displayAlerts}
                  events={displayEvents}
                  selectedCrew={displaySelectedCrew}
                  onSelectCrew={crew => isDemoMode ? setSelectedDemoCrewId(crew.id) : setSelectedCrew(crew)}
                  onNavigate={sec => navigateSection(sec)}
                  onOpenAlerts={() => setIsAlertsOpen(true)}
                />
              )}

              {activeSection === 'crew_body' && (
                <CrewBodyMonitor
                  crewList={displayCrewList}
                  selectedCrew={displaySelectedCrew}
                  onSelectCrew={crew => isDemoMode ? setSelectedDemoCrewId(crew.id) : setSelectedCrew(crew)}
                  readings={displayReadings}
                  onOpenResearch={handleOpenResearchFromModel}
                />
              )}

              {activeSection === 'trends' && (
                <HealthTrends
                  crewList={displayCrewList}
                  selectedCrew={displaySelectedCrew}
                  onSelectCrew={crew => isDemoMode ? setSelectedDemoCrewId(crew.id) : setSelectedCrew(crew)}
                  readings={displayReadings}
                />
              )}

              {activeSection === 'ai_assistant' && (
                <AIAssistant
                  activeSection={activeSection}
                  selectedCrew={displaySelectedCrew}
                  readings={displayReadings}
                  alerts={displayAlerts}
                  isGeminiActive={isGeminiActive}
                  onExecuteAction={handleExecuteAction}
                  initialPrompt={aiInitialPrompt}
                  selectedStudy={aiSelectedStudy}
                />
              )}

              {activeSection === 'research' && (
                <ResearchLibrary
                  initialCategory={researchCategoryFilter}
                  onAskAI={handleAskAIFromStudy}
                />
              )}

              {activeSection === 'importer' && (isDemoMode ? <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-6 text-sm text-amber-100">Demo Mode is read-only. Exit Demo Mode to import real datasets.</div> : (
                <DataImporter
                  importedDatasets={importedDatasets}
                  onImportComplete={fetchData}
                  onClearAllImported={handleClearAllImported}
                  onDeleteDataset={handleDeleteDataset}
                />
              ))}

              {activeSection === 'enter_readings' && (isDemoMode ? <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-6 text-sm text-amber-100">Demo Mode is read-only. Exit Demo Mode to enter real readings.</div> : (
                <EnterReadings
                  crewList={crewList}
                  selectedCrew={selectedCrew}
                  onReadingAdded={fetchData}
                />
              ))}

              {activeSection === 'crew_profiles' && (isDemoMode ? <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-6 text-sm text-amber-100">Demo Mode is read-only. Exit Demo Mode to manage real crew profiles.</div> : (
                <CrewProfiles crewList={crewList} onSaved={fetchData} />
              ))}

              {activeSection === 'smartwatch' && (isDemoMode ? <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-6 text-sm text-amber-100">Device connections are disabled in Demo Mode. Exit Demo Mode to access wearable tools.</div> : <VirtualSmartwatch crewList={crewList} selectedCrew={selectedCrew} />)}

              {activeSection === 'yoma' && (isDemoMode ? <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-6 text-sm text-amber-100">Camera assessments are disabled in Demo Mode. Exit Demo Mode to run a real assessment.</div> : (
                <div className="space-y-4">
                  <YomaMovement assessments={movementAssessments} crewList={crewList} onRefresh={fetchData} />
                </div>
              ))}

              {activeSection === 'settings' && (isDemoMode ? <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-6 text-sm text-amber-100">Mission settings are locked in Demo Mode. Exit Demo Mode to edit settings.</div> : (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  isGeminiActive={isGeminiActive}
                  sensorIngestConfigured={sensorIngestConfigured}
                />
              ))}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        {[
          { id: 'overview' as NavSection, label: 'Home', Icon: LayoutDashboard },
          { id: 'crew_body' as NavSection, label: 'Crew', Icon: UserRound },
          { id: 'trends' as NavSection, label: 'Trends', Icon: LineChart },
          { id: 'ai_assistant' as NavSection, label: 'AI', Icon: Bot }
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => navigateSection(id)} aria-current={activeSection === id ? 'page' : undefined}
            className={`min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${activeSection === id ? 'text-cyan-300' : 'text-slate-400'}`}>
            <Icon className="h-5 w-5" />{label}
          </button>
        ))}
        <button onClick={() => setIsMobileNavOpen(true)} className="min-h-14 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-slate-400">
          <Menu className="h-5 w-5" />More
        </button>
      </nav>

      {/* Auxiliary Modals */}
      {isAlertsOpen && (
        <AlertsCenterModal
          alerts={displayAlerts}
          crewList={displayCrewList}
          onClose={() => setIsAlertsOpen(false)}
          isDemoMode={isDemoMode}
        />
      )}

      {isComparisonOpen && (
        <CrewComparisonModal
          crewList={displayCrewList}
          readings={displayReadings}
          onClose={() => setIsComparisonOpen(false)}
        />
      )}

      {isEnvironmentOpen && (
        <EnvironmentMonitorModal
          onClose={() => setIsEnvironmentOpen(false)}
        />
      )}

      {isReportOpen && (
        <MissionReportModal
          selectedCrew={displaySelectedCrew}
          readings={displayReadings}
          alerts={displayAlerts}
          missionName={isDemoMode ? 'ASTRAMED DEMO MISSION' : settings.missionName}
          isDemoMode={isDemoMode}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
