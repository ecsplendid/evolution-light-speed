import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';

const ErrorThresholdSimulator = () => {
  // Parameters
  const [L, setL] = useState(20); // Genome length
  const [p, setP] = useState(0.05); // Mutation rate per site
  const [s, setS] = useState(0.2); // Selection coefficient
  const [popSize, setPopSize] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  
  // Population state
  const [population, setPopulation] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Initialize population with perfect wildtype
  const initializePopulation = () => {
    const wildtype = Array(L).fill(1);
    const pop = Array(popSize).fill(null).map(() => ({
      genome: [...wildtype],
      fitness: 0 // Hamming distance from wildtype (0 = perfect)
    }));
    setPopulation(pop);
    setHistory([{
      gen: 0,
      avgHamming: 0,
      wildtypeFreq: 1,
      mutationLoad: 0,
      informationRate: L,
      entropy: 0
    }]);
    setGeneration(0);
  };
  
  useEffect(() => {
    initializePopulation();
  }, [L, popSize]);
  
  // Calculate Hamming distance from wildtype (all 1s)
  const hammingDistance = (genome) => {
    return genome.filter(bit => bit === 0).length;
  };
  
  // Calculate fitness (lower Hamming = higher fitness)
  const calculateFitness = (hamming) => {
    if (hamming === 0) return 1 + s; // Wildtype fitness
    return 1; // All mutants have same fitness
  };
  
  // Mutate a genome
  const mutate = (genome) => {
    return genome.map(bit => Math.random() < p ? 1 - bit : bit);
  };
  
  // Run one generation
  const runGeneration = () => {
    setPopulation(currentPop => {
      // Calculate fitness for all individuals
      const withFitness = currentPop.map(ind => ({
        ...ind,
        hamming: hammingDistance(ind.genome),
        fitness: calculateFitness(hammingDistance(ind.genome))
      }));
      
      // Selection: weighted sampling by fitness
      const totalFitness = withFitness.reduce((sum, ind) => sum + ind.fitness, 0);
      const newPop = [];
      
      for (let i = 0; i < popSize; i++) {
        let r = Math.random() * totalFitness;
        let selected = withFitness[0];
        
        for (const ind of withFitness) {
          r -= ind.fitness;
          if (r <= 0) {
            selected = ind;
            break;
          }
        }
        
        // Reproduce with mutation
        const offspring = {
          genome: mutate([...selected.genome]),
          fitness: 0
        };
        offspring.hamming = hammingDistance(offspring.genome);
        offspring.fitness = calculateFitness(offspring.hamming);
        
        newPop.push(offspring);
      }
      
      // Calculate statistics
      const avgHamming = newPop.reduce((sum, ind) => sum + ind.hamming, 0) / popSize;
      const wildtypeCount = newPop.filter(ind => ind.hamming === 0).length;
      const wildtypeFreq = wildtypeCount / popSize;
      const mutationLoad = L * p;
      
      // Calculate entropy (diversity measure)
      const hammingCounts = {};
      newPop.forEach(ind => {
        hammingCounts[ind.hamming] = (hammingCounts[ind.hamming] || 0) + 1;
      });
      const entropy = -Object.values(hammingCounts).reduce((sum, count) => {
        const prob = count / popSize;
        return sum + (prob > 0 ? prob * Math.log2(prob) : 0);
      }, 0);
      
      // Calculate information rate (bits/generation being maintained)
      // This is approximate: wildtype frequency × genome length
      const informationRate = wildtypeFreq * L;

      setHistory(h => [...h.slice(-200), {
        gen: generation + 1,
        avgHamming,
        wildtypeFreq,
        mutationLoad,
        informationRate,
        entropy
      }]);
      
      setGeneration(g => g + 1);
      
      return newPop;
    });
  };
  
  // Animation loop
  useEffect(() => {
    if (!isRunning) return;
    const timer = setTimeout(runGeneration, 50);
    return () => clearTimeout(timer);
  }, [isRunning, generation]);
  
  // Calculate error threshold metrics
  const errorThreshold = 1 / p;
  const currentMutationLoad = L * p;
  const isBelowThreshold = L < errorThreshold;
  const thresholdRatio = L / errorThreshold;
  
  const latestStats = history[history.length - 1] || { avgHamming: 0, wildtypeFreq: 0, informationRate: 0, entropy: 0 };
  
  return (
    <div className="w-full mx-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Error Threshold Simulator</h1>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Info className="w-6 h-6 text-slate-600" />
          </button>
        </div>
        
        {showInfo && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
            <h3 className="font-bold mb-2">How to interpret:</h3>
            <ul className="space-y-1 text-slate-700">
              <li>• <strong>⚡ Evolutionary Speed</strong>: L×p ≈ 1.0 is the "light speed" - maximum sustainable information transfer rate</li>
              <li>• <strong>Green zone</strong>: L &lt; 1/p → Selection maintains wildtype, evolution works optimally</li>
              <li>• <strong>Red zone</strong>: L &gt; 1/p → Error catastrophe: mutations arrive faster than selection can fix them</li>
              <li>• <strong>Wildtype frequency</strong>: Fraction of perfect (error-free) genomes - high = evolution working</li>
              <li>• <strong>Avg Hamming</strong>: Average mutations per genome from optimal</li>
              <li>• <strong>Key insight</strong>: Selection acts on ALL L loci simultaneously, but L×p &lt; 1 is the hard limit!</li>
            </ul>
          </div>
        )}
        
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Genome Length (L): {L}
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={L}
              onChange={(e) => setL(Number(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mutation Rate (p): {p.toFixed(3)}
            </label>
            <input
              type="range"
              min="0.001"
              max="0.2"
              step="0.001"
              value={p}
              onChange={(e) => setP(Number(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Selection Strength (s): {s.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={s}
              onChange={(e) => setS(Number(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Population Size: {popSize}
            </label>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={popSize}
              onChange={(e) => setPopSize(Number(e.target.value))}
              disabled={isRunning}
              className="w-full"
            />
          </div>
        </div>
        
        {/* Status Panel */}
        <div className={`p-4 rounded-lg mb-6 ${isBelowThreshold ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800">{errorThreshold.toFixed(1)}</div>
              <div className="text-xs text-slate-600">Error Threshold (1/p)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{currentMutationLoad.toFixed(2)}</div>
              <div className="text-xs text-slate-600">Mutation Load (L×p)</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${isBelowThreshold ? 'text-green-600' : 'text-red-600'}`}>
                {(thresholdRatio * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-600">Threshold Ratio (L/(1/p))</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {isBelowThreshold ? '✓ STABLE' : '✗ CATASTROPHE'}
              </div>
              <div className="text-xs text-slate-600">System State</div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={initializePopulation}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <div className="ml-auto text-lg font-semibold text-slate-700">
            Generation: {generation}
          </div>
        </div>
        
        {/* Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Population View */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Population Genomes (first 30 individuals)</h3>
            <div className="bg-slate-900 rounded-lg p-4 overflow-auto" style={{maxHeight: '600px'}}>
              {population.slice(0, 30).map((ind, idx) => (
                <div key={idx} className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-8 flex-shrink-0">{idx + 1}</span>
                  <div className="flex gap-px flex-wrap">
                    {ind.genome.map((bit, i) => (
                      <div
                        key={i}
                        className={`h-5 ${bit === 1 ? 'bg-green-400' : 'bg-red-400'}`}
                        style={{width: `${Math.max(6, Math.min(12, 600 / L))}px`}}
                        title={`Position ${i}: ${bit}`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs ml-2 flex-shrink-0 ${ind.hamming === 0 ? 'text-green-400 font-bold' : 'text-slate-400'}`}>
                    {ind.hamming === 0 ? '★ WT' : `d=${ind.hamming}`}
                  </span>
                </div>
              ))}
              {population.length > 30 && (
                <div className="text-xs text-slate-500 mt-2">
                  ... and {population.length - 30} more
                </div>
              )}
            </div>
          </div>
          
          {/* Time Series */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-slate-800">Evolution Over Time</h3>
            <div className="space-y-4">
              {/* Evolutionary Light Speed */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Evolutionary Speed (mutations/gen)</span>
                  <span className={`font-semibold ${currentMutationLoad < 1.2 ? 'text-green-600' : currentMutationLoad < 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                    {currentMutationLoad.toFixed(2)} {currentMutationLoad < 1.2 ? '⚡' : currentMutationLoad < 1.5 ? '⚠️' : '🔥'}
                  </span>
                </div>
                <div className="h-16 bg-slate-100 rounded relative">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
                    {/* Reference line at 1.0 (light speed) */}
                    <line
                      x1="0"
                      y1="75"
                      x2="100"
                      y2="75"
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                      strokeDasharray="2,2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text x="2" y="73" fontSize="3" fill="#64748b">1.0 (optimal)</text>
                    <polyline
                      points={history.map((h, i) => {
                        const mutLoad = h.mutationLoad || (L * p);
                        const yPos = 100 - Math.min(mutLoad * 25, 100);
                        return `${(i / history.length) * 100},${yPos}`;
                      }).join(' ')}
                      fill="none"
                      stroke={currentMutationLoad < 1.2 ? '#10b981' : currentMutationLoad < 1.5 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>

              {/* Wildtype Frequency */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Wildtype Frequency</span>
                  <span className="font-semibold">{(latestStats.wildtypeFreq * 100).toFixed(1)}%</span>
                </div>
                <div className="h-16 bg-slate-100 rounded relative">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
                    <polyline
                      points={history.map((h, i) =>
                        `${(i / history.length) * 100},${100 - h.wildtypeFreq * 100}`
                      ).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
              
              {/* Average Hamming Distance */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Avg Hamming Distance</span>
                  <span className="font-semibold">{latestStats.avgHamming.toFixed(2)}</span>
                </div>
                <div className="h-16 bg-slate-100 rounded relative">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
                    <polyline
                      points={history.map((h, i) =>
                        `${(i / history.length) * 100},${100 - (h.avgHamming / L) * 100}`
                      ).join(' ')}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
              
              {/* Entropy */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Population Diversity (Entropy)</span>
                  <span className="font-semibold">{latestStats.entropy.toFixed(2)} bits</span>
                </div>
                <div className="h-16 bg-slate-100 rounded relative">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
                    <polyline
                      points={history.map((h, i) =>
                        `${(i / history.length) * 100},${100 - (h.entropy / Math.log2(popSize)) * 100}`
                      ).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
              </div>
              
              {/* Current Stats */}
              <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Mutations/genome/gen:</span>
                  <span className="font-semibold">{(L * p).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Perfect genomes:</span>
                  <span className="font-semibold">{Math.round(latestStats.wildtypeFreq * popSize)}/{popSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fitness advantage:</span>
                  <span className="font-semibold">{((1 + s) / 1 * 100 - 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Educational Notes */}
        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 text-sm">
          <h3 className="font-bold mb-2 text-amber-900">Try This - Watch the "Light Speed of Evolution":</h3>
          <ol className="list-decimal list-inside space-y-1 text-slate-700">
            <li>Start with L=20, p=0.05 (L×p=1.0 ⚡) - watch the green "evolutionary speed" line near optimal 1.0</li>
            <li>Wildtype persists ~60-80%, selection maintains information at maximum sustainable rate</li>
            <li>Increase L to 50 (L×p=2.5 🔥) - speed line turns RED, exceeding the "light speed limit"</li>
            <li>Error catastrophe: mutations arrive faster than selection can fix them - wildtype crashes to 0%</li>
            <li>Note: The "1 bit/gen" is about CAPACITY not parallelism - selection tracks ALL L bits simultaneously!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ErrorThresholdSimulator;