import React, { useEffect, useState } from 'react';
import { User, Trophy, TrendingUp, ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import styles from './EloScorePage.module.css';

interface EloHistoryPoint {
  date: string;
  score: number;
}

interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  eloScore: number;
  rank: number;
}

const EloScorePage: React.FC = () => {
  const [currentUserElo, setCurrentUserElo] = useState<number>(1200);
  const [eloHistory, setEloHistory] = useState<EloHistoryPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get user info from localStorage
    const email = localStorage.getItem('user_email') || '';
    const name = localStorage.getItem('user_name') || 'User';
    const photoUrl = localStorage.getItem('user_photo_url') || null;
    
    setUserEmail(email);
    setUserName(name);
    setUserPhotoUrl(photoUrl);
    
    // Fetch data
    fetchEloData();
  }, []);

  const fetchEloData = async () => {
    setIsLoading(true);
    
    try {
      // These would be replaced with actual API calls
      setCurrentUserElo(1450);
      const mockHistory = generateMockEloHistory();
      setEloHistory(mockHistory);
      const mockLeaderboard = generateMockLeaderboard();
      setLeaderboard(mockLeaderboard);
      const userEntry = mockLeaderboard.find(user => user.email === userEmail);
      setUserRank(userEntry?.rank || null);
    } catch (error) {
      console.error('Error fetching ELO data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockEloHistory = (): EloHistoryPoint[] => {
    const history: EloHistoryPoint[] = [];
    const startScore = 1200;
    let currentScore = startScore;
    
    // Configuration for more realistic patterns
    const totalDays = 90; // Show 90 days of history instead of 30
    const matchesPerDay = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3]; // Varying number of matches per day
    
    // Skill improvement factor (user gradually gets better)
    const skillProgressionRate = 0.2;
    
    // Create date array working backward from today
    const dates: Date[] = [];
    for (let i = totalDays; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    // Track current form (affects win probability)
    let currentForm = 0; // Range from -5 (slump) to 5 (hot streak)
    
    // Starting point
    history.push({
      date: dates[0].toISOString().split('T')[0],
      score: currentScore
    });
    
    // Generate ELO changes for each day
    for (let dayIndex = 1; dayIndex < dates.length; dayIndex++) {
      const date = dates[dayIndex];
      const dateStr = date.toISOString().split('T')[0];
      
      // User plays 0-3 matches per day with weighted randomness
      const dailyMatches = matchesPerDay[Math.floor(Math.random() * matchesPerDay.length)];
      let dayScore = currentScore;
      
      // Simulate matches for this day
      for (let match = 0; match < dailyMatches; match++) {
        // Calculate base win probability based on:
        // 1. Current form (hot/cold streak)
        // 2. Skill progression (user gets better over time)
        // 3. Random element
        const timeProgression = dayIndex / totalDays; // 0 to 1 progression through time
        const skillFactor = timeProgression * skillProgressionRate;
        const formFactor = currentForm / 10; // Convert form to -0.5 to 0.5
        
        // Win probability increases with time (skill improvement) and form
        let winProbability = 0.5 + skillFactor + formFactor;
        
        // Adjust for realistic bounds
        winProbability = Math.max(0.2, Math.min(0.8, winProbability));
        
        // Determine match outcome
        const isWin = Math.random() < winProbability;
        
        // ELO change depends on:
        // 1. Win/loss
        // 2. Opponent strength (implied by K factor)
        // 3. Small random element
        const kFactor = 16 + Math.floor(Math.random() * 10); // 16-25
        
        // Apply more realistic ELO change
        if (isWin) {
          dayScore += Math.floor(kFactor * (1 - winProbability) + Math.random() * 3);
          currentForm = Math.min(5, currentForm + 1); // Improve form with win
        } else {
          dayScore -= Math.floor(kFactor * winProbability + Math.random() * 3);
          currentForm = Math.max(-5, currentForm - 1); // Worsen form with loss
        }
        
        // Regression to mean for form
        currentForm *= 0.9;
      }
      
      // Only record days where the score changed or every 7 days
      if (dayScore !== currentScore || dayIndex % 7 === 0) {
        history.push({
          date: dateStr,
          score: dayScore
        });
        currentScore = dayScore;
      }
    }
    
    // Enforce a realistic minimum/maximum ELO and final value 
    const finalTarget = 1450;
    const minElo = 1100;
    const maxElo = 1600;
    
    return history
      .map((point, index, array) => {
        // Adjust points to ensure final score ends near target
        if (index === array.length - 1) {
          // Ensure last value is the final target
          return { ...point, score: finalTarget };
        } else if (index > array.length - 5) {
          // Smoothly approach the final target in the last few data points
          const stepsToEnd = array.length - index;
          const adjustment = (finalTarget - point.score) * (1 - (stepsToEnd - 1) / 4);
          return { ...point, score: Math.round(point.score + adjustment) };
        }
        
        // Constrain all values to reasonable bounds
        return { 
          ...point, 
          score: Math.max(minElo, Math.min(maxElo, point.score)) 
        };
      });
  };

  const generateMockLeaderboard = (): LeaderboardUser[] => {
    const users = [
      { id: '1', name: 'Emma Johnson', email: 'emma@example.com', eloScore: 1820, rank: 1 },
      { id: '2', name: 'James Smith', email: 'james@example.com', eloScore: 1750, rank: 2 },
      { id: '3', name: 'Olivia Williams', email: 'olivia@example.com', eloScore: 1690, rank: 3 },
      { id: '4', name: 'Noah Brown', email: 'noah@example.com', eloScore: 1630, rank: 4 },
      { id: '5', name: 'Sophie Davis', email: 'sophie@example.com', eloScore: 1580, rank: 5 },
      { id: '6', name: 'Lucas Miller', email: 'lucas@example.com', eloScore: 1540, rank: 6 },
      { id: '7', name: 'Ava Wilson', email: 'ava@example.com', eloScore: 1510, rank: 7 },
      { id: '8', name: 'Liam Moore', email: 'liam@example.com', eloScore: 1480, rank: 8 },
      { id: '9', name: userEmail === 'user@example.com' ? userName : 'Charlotte Taylor', 
         email: userEmail === 'user@example.com' ? userEmail : 'charlotte@example.com', 
         eloScore: 1450, 
         photoUrl: userEmail === 'user@example.com' ? userPhotoUrl : undefined,
         rank: 9 },
      { id: '10', name: 'Ethan Anderson', email: 'ethan@example.com', eloScore: 1400, rank: 10 },
    ];
    
    if (!users.find(u => u.email === userEmail)) {
      const position = Math.floor(Math.random() * 20) + 10;
      users.push({
        id: '999',
        name: userName,
        email: userEmail,
        photoUrl: userPhotoUrl,
        eloScore: currentUserElo,
        rank: position
      });
    }
    
    return users.sort((a, b) => a.rank - b.rank);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEloChangeColor = () => {
    if (eloHistory.length < 2) return styles.neutral;
    
    const latestScore = eloHistory[eloHistory.length - 1].score;
    const previousScore = eloHistory[eloHistory.length - 2].score;
    
    if (latestScore > previousScore) return styles.positive;
    if (latestScore < previousScore) return styles.negative;
    return styles.neutral;
  };

  const getEloChange = () => {
    if (eloHistory.length < 2) return "+0";
    
    const latestScore = eloHistory[eloHistory.length - 1].score;
    const previousScore = eloHistory[eloHistory.length - 2].score;
    const change = latestScore - previousScore;
    
    return change > 0 ? `+${change}` : change;
  };
  
  const renderUserAvatar = (photoUrl: string | undefined, name: string) => {
    if (photoUrl) {
      return <img src={photoUrl} alt={name} className={styles.avatarImage} />;
    } else {
      return <div className={styles.defaultUserAvatar}>{name.charAt(0).toUpperCase()}</div>;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading ELO data...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>ELO Performance</h1>
        <div className={styles.refreshButton} onClick={fetchEloData}>
          Refresh
        </div>
      </div>
      
      <div className={styles.dashboardGrid}>
        {/* ELO Summary Card */}
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <User size={18} />
              <span>Your ELO</span>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.eloSummary}>
              <div className={styles.eloMain}>
                <div className={styles.eloMainValue}>{currentUserElo}</div>
                <div className={`${styles.eloChange} ${getEloChangeColor()}`}>
                  {getEloChange() > 0 ? (
                    <ChevronUp size={16} className={styles.changeIcon} />
                  ) : getEloChange() < 0 ? (
                    <ChevronDown size={16} className={styles.changeIcon} />
                  ) : null}
                  {getEloChange()}
                </div>
              </div>
              <div className={styles.eloDetails}>
                <div className={styles.eloDetailItem}>
                  <span className={styles.eloDetailLabel}>Rank</span>
                  <span className={styles.eloDetailValue}>#{userRank}</span>
                </div>
                <div className={styles.eloDetailItem}>
                  <span className={styles.eloDetailLabel}>Highest</span>
                  <span className={styles.eloDetailValue}>
                    {Math.max(...eloHistory.map(h => h.score))}
                  </span>
                </div>
                <div className={styles.eloDetailItem}>
                  <span className={styles.eloDetailLabel}>Average</span>
                  <span className={styles.eloDetailValue}>
                    {Math.floor(eloHistory.reduce((sum, h) => sum + h.score, 0) / eloHistory.length)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* User Profile Card */}
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Trophy size={18} />
              <span>Profile</span>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.profileCard}>
              <div className={styles.userAvatar}>
                {renderUserAvatar(userPhotoUrl, userName)}
              </div>
              <div className={styles.userProfileDetails}>
                <h3 className={styles.userName}>{userName}</h3>
                <div className={styles.userStats}>
                  <div className={styles.statBadge}>
                    <span className={styles.statValue}>#{userRank}</span>
                    <span className={styles.statLabel}>Global Rank</span>
                  </div>
                  <div className={styles.statBadge}>
                    <span className={styles.statValue}>
                      {eloHistory.length > 1 ? 
                        (eloHistory[eloHistory.length - 1].score - eloHistory[0].score) >= 0 ?
                          `+${eloHistory[eloHistory.length - 1].score - eloHistory[0].score}` :
                          eloHistory[eloHistory.length - 1].score - eloHistory[0].score
                        : '0'
                      }
                    </span>
                    <span className={styles.statLabel}>30d Change</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Activity Card */}
        <div className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <BarChart3 size={18} />
              <span>Recent Activity</span>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.miniChart}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eloHistory.slice(-7)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#a855f7" 
                    strokeWidth={2} 
                    dot={{ stroke: '#a855f7', fill: 'white', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, stroke: '#a855f7', strokeWidth: 1, fill: '#d8b4fe' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'ELO']}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      padding: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={formatDate}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.recentStatsRow}>
              <div className={styles.recentStat}>
                <span className={styles.recentStatLabel}>7d High</span>
                <span className={styles.recentStatValue}>
                  {Math.max(...eloHistory.slice(-7).map(h => h.score))}
                </span>
              </div>
              <div className={styles.recentStat}>
                <span className={styles.recentStatLabel}>7d Low</span>
                <span className={styles.recentStatValue}>
                  {Math.min(...eloHistory.slice(-7).map(h => h.score))}
                </span>
              </div>
              <div className={styles.recentStat}>
                <span className={styles.recentStatLabel}>7d Change</span>
                <span className={`${styles.recentStatValue} ${
                  eloHistory[eloHistory.length-1].score - eloHistory[eloHistory.length-7].score > 0 
                    ? styles.positiveText 
                    : eloHistory[eloHistory.length-1].score - eloHistory[eloHistory.length-7].score < 0 
                      ? styles.negativeText 
                      : ''
                }`}>
                  {eloHistory[eloHistory.length-1].score - eloHistory[eloHistory.length-7].score > 0 
                    ? `+${eloHistory[eloHistory.length-1].score - eloHistory[eloHistory.length-7].score}` 
                    : eloHistory[eloHistory.length-1].score - eloHistory[eloHistory.length-7].score}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ELO History Chart - Full Width */}
        <div className={`${styles.dashboardCard} ${styles.fullWidthCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <TrendingUp size={18} />
              <span>ELO History</span>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.eloHistoryChart}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eloHistory} margin={{ top: 20, right: 20, left: 5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={{ stroke: '#e2e8f0' }}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={formatDate}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    domain={[
                      dataMin => Math.floor(dataMin * 0.995),
                      dataMax => Math.ceil(dataMax * 1.005)
                    ]}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'ELO']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '4px',
                      padding: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <ReferenceLine 
                    y={1200} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3" 
                    label={{ 
                      value: 'Starting ELO', 
                      position: 'insideBottomRight', 
                      fill: '#94a3b8', 
                      fontSize: 12 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#a855f7" 
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#a855f7', fill: '#d8b4fe' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Leaderboard Card - Full Width */}
        <div className={`${styles.dashboardCard} ${styles.fullWidthCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Trophy size={18} />
              <span>Global Leaderboard</span>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.leaderboardTable}>
              <div className={styles.leaderboardHeader}>
                <div className={styles.leaderboardRank}>Rank</div>
                <div className={styles.leaderboardUser}>Player</div>
                <div className={styles.leaderboardScore}>ELO</div>
              </div>
              <div className={styles.leaderboardBody}>
                {leaderboard.map((user) => (
                  <div 
                    key={user.id} 
                    className={`${styles.leaderboardRow} ${user.email === userEmail ? styles.currentUserRow : ''}`}
                  >
                    <div className={styles.leaderboardRank}>
                      {user.rank <= 3 ? (
                        <div className={`${styles.topRankBadge} ${styles[`rank${user.rank}`]}`}>
                          {user.rank}
                        </div>
                      ) : user.rank}
                    </div>
                    <div className={styles.leaderboardUser}>
                      <div className={styles.leaderboardAvatar}>
                        {renderUserAvatar(user.photoUrl, user.name)}
                      </div>
                      <div className={styles.leaderboardName}>{user.name}</div>
                    </div>
                    <div className={styles.leaderboardScore}>{user.eloScore}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EloScorePage; 