// src/utils/boilerUtils.ts

export type BoilerStatus = 'dormant' | 'overdue' | 'upcoming' | 'ontime' | 'unscheduled';

export const getBoilerStatus = (nextServiceDate: string | undefined): BoilerStatus => {
  if (!nextServiceDate) return 'unscheduled';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextDate = new Date(nextServiceDate);
  nextDate.setHours(0, 0, 0, 0);
  
  // Ak je termín v minulosti
  if (nextDate < today) {
    const diffTime = today.getTime() - nextDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // Viac ako 6 mesiacov (183 dní)
    if (diffDays > 183) {
      return 'dormant'; // ZASPÄTÝ
    }
    return 'overdue'; // PO TERMÍNE
  }
  
  // Ak je termín v budúcnosti alebo dnes
  const diffTimeFuture = nextDate.getTime() - today.getTime();
  const diffDaysFuture = diffTimeFuture / (1000 * 60 * 60 * 24);
  
  if (diffDaysFuture <= 30) {
    return 'upcoming'; // BLÍŽIACE SA
  }
  
  return 'ontime'; // V TERMÍNE
};

export const getStatusColor = (status: BoilerStatus) => {
  switch (status) {
    case 'unscheduled': return '#374151'; // Tmavo šedá
    case 'dormant':     return '#9CA3AF'; // Šedá
    case 'overdue':     return '#C14F4F'; // Červená
    case 'upcoming':    return '#F59E0B'; // Oranžová
    case 'ontime':      return '#10B981'; // Zelená
    default: return '#10B981';
  }
};

export const getStatusLabel = (status: BoilerStatus) => {
  switch (status) {
    case 'unscheduled': return 'BEZ TERMÍNU';
    case 'dormant':     return 'ZASPÄTÝ';
    case 'overdue':     return 'PO TERMÍNE';
    case 'upcoming':    return 'BLÍŽIACE SA';
    case 'ontime':      return 'V TERMÍNE';
    default: return 'V TERMÍNE';
  }
};
