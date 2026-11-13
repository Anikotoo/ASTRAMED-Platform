import React, { useState, useEffect, useCallback } from 'react';
import { 
  CrewMember, 
  HealthReading, 
  HealthAlert, 
  HealthEvent, 
  ImportedDataset, 
  MissionSettings 
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

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [importedDatasets, setImportedDatasets] = useState<ImportedDataset[]>([]);
  const [settings, setSettings] = useState<MissionSettings>(DEFAULT_MISSION_SETTINGS);
  const [isGeminiActive, setIsGeminiActive] = useState<boolean>(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

  // Modals state
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);
  const [isEnvironmentOpen, setIsEnvironmentOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Cross-component prompt passing (e.g. from Research Library to AI Assistant)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
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
        healthRes
      ] = await Promise.all([
        fetch('/api/crew'),
        fetch('/api/readings'),
        fetch('/api/alerts'),
        fetch('/api/events'),
        fetch('/api/datasets'),
        fetch('/api/settings'),
        fetch('/api/health')
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

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setIsGeminiActive(Boolean(healthData.geminiConfigured));
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
        settings: 'settings'
      };
      if (sectionMap[action.targetSection]) {
        setActiveSection(sectionMap[action.targetSection]);
      }
    }

    if (action.params?.crewId) {
      const target = crewList.find(c => c.id === action.params?.crewId);
      if (target) {
        setSelectedCrew(target);
      }
    }

    if (action.params?.category) {
      setResearchCategoryFilter(action.params.category);
    }
  };

  // Navigate to Research from Body Map
  const handleOpenResearchFromModel = (category: string) => {
    setResearchCategoryFilter(category);
    setActiveSection('research');
  };

  // Navigate to AI Assistant with initial prompt
  const handleAskAIFromStudy = (prompt: string) => {
    setAiInitialPrompt(prompt);
    setActiveSection('ai_assistant');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Left Mission Navigation Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={section => {
          setActiveSection(section);
          setIsMobileNavOpen(false);
        }}
        alertCount={alerts.length}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Mission Status Bar */}
        <TopStatusBar
          missionName={settings.missionName}
          missionStartDate={settings.missionStartDate}
          crewList={crewList}
          selectedCrew={selectedCrew}
          onSelectCrew={crew => setSelectedCrew(crew)}
          alerts={alerts}
          isGeminiActive={isGeminiActive}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenComparison={() => setIsComparisonOpen(true)}
          onOpenReport={() => setIsReportOpen(true)}
          onOpenEnvironment={() => setIsEnvironmentOpen(true)}
          onToggleMobileNav={() => setIsMobileNavOpen(prev => !prev)}
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto p-6 min-h-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/60">
          {isLoadingInitial ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-cyan-400 font-mono text-xs">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <div>SYNCHRONIZING ASTRAMED TELEMETRY STREAM...</div>
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <MissionOverview
                  crewList={crewList}
                  readings={readings}
                  alerts={alerts}
                  events={events}
                  selectedCrew={selectedCrew}
                  onSelectCrew={crew => setSelectedCrew(crew)}
                  onNavigate={sec => setActiveSection(sec)}
                  onOpenAlerts={() => setIsAlertsOpen(true)}
                />
              )}

              {activeSection === 'crew_body' && (
                <CrewBodyMonitor
                  crewList={crewList}
                  selectedCrew={selectedCrew}
                  onSelectCrew={crew => setSelectedCrew(crew)}
                  readings={readings}
                  onOpenResearch={handleOpenResearchFromModel}
                />
              )}

              {activeSection === 'trends' && (
                <HealthTrends
                  crewList={crewList}
                  selectedCrew={selectedCrew}
                  onSelectCrew={crew => setSelectedCrew(crew)}
                  readings={readings}
                />
              )}

              {activeSection === 'ai_assistant' && (
                <AIAssistant
                  activeSection={activeSection}
                  selectedCrew={selectedCrew}
                  readings={readings}
                  alerts={alerts}
                  isGeminiActive={isGeminiActive}
                  onExecuteAction={handleExecuteAction}
                  initialPrompt={aiInitialPrompt}
                />
              )}

              {activeSection === 'research' && (
                <ResearchLibrary
                  initialCategory={researchCategoryFilter}
                  onAskAI={handleAskAIFromStudy}
                />
              )}

              {activeSection === 'importer' && (
                <DataImporter
                  importedDatasets={importedDatasets}
                  onImportComplete={fetchData}
                  onClearAllImported={handleClearAllImported}
                  onDeleteDataset={handleDeleteDataset}
                />
              )}

              {activeSection === 'enter_readings' && (
                <EnterReadings
                  crewList={crewList}
                  selectedCrew={selectedCrew}
                  onReadingAdded={fetchData}
                />
              )}

              {activeSection === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  isGeminiActive={isGeminiActive}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Auxiliary Modals */}
      {isAlertsOpen && (
        <AlertsCenterModal
          alerts={alerts}
          crewList={crewList}
          onClose={() => setIsAlertsOpen(false)}
        />
      )}

      {isComparisonOpen && (
        <CrewComparisonModal
          crewList={crewList}
          readings={readings}
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
          selectedCrew={selectedCrew}
          readings={readings}
          alerts={alerts}
          missionName={settings.missionName}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}
