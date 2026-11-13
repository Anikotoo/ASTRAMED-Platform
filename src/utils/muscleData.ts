import { MuscleGroupInfo } from '../types/astramed';

export const MUSCLE_GROUPS: Record<string, MuscleGroupInfo> = {
  biceps: {
    id: 'biceps',
    name: 'Biceps Brachii',
    latinName: 'Musculus biceps brachii',
    location: 'anterior',
    crewMetricKey: 'muscle_strength_bicep',
    primaryFunction: 'Forearm flexion, supination, and intra-vehicular manual maneuvering.',
    microgravityImpact: 'Moderate atrophy (-3% to -5% over 180 days). Primarily affected by shift from gravity-assisted loads to grip-pull tasks in cabin translation.',
    countermeasures: 'aRED bicep curls and upper-body ergometer resistance intervals.',
    relatedResearchKeywords: ['biceps brachii atrophy', 'upper limb microgravity', 'spaceflight resistance exercise']
  },
  triceps: {
    id: 'triceps',
    name: 'Triceps Brachii',
    latinName: 'Musculus triceps brachii',
    location: 'posterior',
    crewMetricKey: 'muscle_strength_bicep',
    primaryFunction: 'Elbow extension and push-off stabilization against spacecraft bulkheads.',
    microgravityImpact: 'Lower atrophy relative to postural lower limb muscles (-2% to -4%). Continual usage in cabin station-keeping.',
    countermeasures: 'Overhead tricep extensions and push-press cycles on aRED.',
    relatedResearchKeywords: ['triceps brachii spaceflight', 'upper extremity muscular performance']
  },
  deltoids: {
    id: 'deltoids',
    name: 'Deltoids',
    latinName: 'Musculus deltoideus',
    location: 'both',
    crewMetricKey: 'muscle_strength_bicep',
    primaryFunction: 'Arm abduction, anterior flexion, and Extravehicular Activity (EVA) spacesuit glove/sleeve manipulation.',
    microgravityImpact: 'High fatigue during spacewalks due to rigid suit pressurized joints (4.3 psi EMU differential); mild microgravity atrophy (-4%).',
    countermeasures: 'Deltoid raises, resistance band overhead pulls, and EVA pre-training.',
    relatedResearchKeywords: ['deltoid fatigue EVA', 'spacesuit shoulder mobility', 'microgravity shoulder biomechanics']
  },
  pectorals: {
    id: 'pectorals',
    name: 'Pectoralis Major',
    latinName: 'Musculus pectoralis major',
    location: 'anterior',
    crewMetricKey: 'muscle_strength_bicep',
    primaryFunction: 'Arm adduction, internal rotation, and chest stability during heavy translation.',
    microgravityImpact: 'Low to moderate mass decline (-3% to -6%). Absence of postural resistance alters resting muscle tone.',
    countermeasures: 'Bench press protocols on aRED with variable pneumatic resistance (up to 600 lbs equivalent).',
    relatedResearchKeywords: ['pectoralis major spaceflight', 'resistive countermeasure aRED bench press']
  },
  abdominals: {
    id: 'abdominals',
    name: 'Abdominal Core Complex',
    latinName: 'Musculus rectus abdominis & transversus',
    location: 'anterior',
    crewMetricKey: 'muscle_strength_quad',
    primaryFunction: 'Core stabilization, trunk flexion, and visceral support against cephalad fluid movement.',
    microgravityImpact: 'Significant loss of tonic postural activation (-8% to -12%). Lengthening of the spinal column by up to 5-7 cm causes astronaut back pain.',
    countermeasures: 'Abdominal crunches on aRED, pelvic tilt stabilization, and neutral body posture positioning.',
    relatedResearchKeywords: ['spinal lengthening spaceflight', 'abdominal muscle tone microgravity', 'astronaut lower back pain']
  },
  quadriceps: {
    id: 'quadriceps',
    name: 'Quadriceps Femoris',
    latinName: 'Musculus quadriceps femoris',
    location: 'anterior',
    crewMetricKey: 'muscle_strength_quad',
    primaryFunction: 'Knee extension, weight-bearing locomotion, and jumping.',
    microgravityImpact: 'Severe selective atrophy (-10% to -18% over 180 days). Substantial conversion of slow-twitch Type I fibers to fatigable Type IIx fibers due to complete gravity unloading.',
    countermeasures: 'High-intensity aRED squats, deadlifts, and heel raises at maximal voluntary isometric contraction.',
    relatedResearchKeywords: ['quadriceps femoris atrophy spaceflight', 'Type I fiber shift microgravity', 'aRED squat countermeasure']
  },
  hamstrings: {
    id: 'hamstrings',
    name: 'Hamstrings Complex',
    latinName: 'Musculi bicipitis femoris & semitendinosus',
    location: 'posterior',
    crewMetricKey: 'muscle_strength_quad',
    primaryFunction: 'Knee flexion, hip extension, and posterior chain stabilization.',
    microgravityImpact: 'Marked volume loss (-12% to -16%). Rapid loss of sarcomeres in series and reduced peak force output.',
    countermeasures: 'Romanian deadlifts, single-leg hamstring curls, and T2 treadmill interval running with harness bungee loading.',
    relatedResearchKeywords: ['hamstring mass decline spaceflight', 'posterior chain atrophy ISS', 'treadmill vibration isolation T2']
  },
  calves: {
    id: 'calves',
    name: 'Calves (Soleus & Gastrocnemius)',
    latinName: 'Musculus soleus & gastrocnemius',
    location: 'posterior',
    crewMetricKey: 'muscle_strength_quad',
    primaryFunction: 'Plantar flexion, postural equilibrium, and venous muscle pump in 1-G.',
    microgravityImpact: 'Most severely degraded muscle group in orbit (Soleus volume drops up to -20% to -24%). Loss of baseline tonic postural firing leads to tendon stiffness reduction and post-flight postural ataxia.',
    countermeasures: 'Straight-leg and bent-leg calf raises on aRED; cycle ergometer with toe clips.',
    relatedResearchKeywords: ['soleus atrophy microgravity', 'gastrocnemius volume ISS astronauts', 'muscle protein synthesis spaceflight']
  }
};
