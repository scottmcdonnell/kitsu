<template>
  <div class="person-stats-ticker">
    <div class="stats-container">
      <stat
        class="ticker-stat"
        :label="$t('timesheets.hours_this_week')"
        :number="hoursThisWeek"
        unit="h"
        :description="$t('timesheets.hours_description')"
        :arrow="hoursWeekTrend"
        :number-tooltip="hoursThisWeekTooltip"
        :trend-tooltip="hoursTrendTooltip"
      />

      <stat
        class="ticker-stat"
        :label="$t('tasks.sent_for_review')"
        :number="tasksForReviewThisWeek"
        :description="$t('tasks.sent_for_review_description')"
        :number-tooltip="tasksForReviewTooltip"
      />

      <stat
        class="ticker-stat"
        :label="$t('tasks.validated_this_week')"
        :number="tasksValidatedThisWeek"
        :description="$t('tasks.validated_description')"
        :number-tooltip="tasksValidatedTooltip"
      />

      <stat
        class="ticker-stat"
        :label="$t('tasks.completion_rate')"
        :number="completionRate"
        unit="%"
        :description="$t('tasks.completion_rate_description')"
        :arrow="completionRateTrend"
        :number-tooltip="completionRateTooltip"
        :trend-tooltip="completionRateTrendTooltip"
      />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import moment from 'moment-timezone'

import Stat from '@/components/widgets/Stat.vue'

export default {
  name: 'person-stats',

  components: {
    Stat
  },

  props: {
    personId: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      isLoading: false,
      weeklyStats: {
        current: {},
        previous: {}
      }
    }
  },

  computed: {
    ...mapGetters([
      'personTimeSpentMap',
      'personTimeSpentTotal',
      'personTasks',
      'personDoneTasks',
      'taskStatusMap'
    ]),

    currentWeekStart() {
      return moment().startOf('isoWeek')
    },

    previousWeekStart() {
      return moment().subtract(1, 'week').startOf('isoWeek')
    },

    hoursThisWeek() {
      const startOfWeek = this.currentWeekStart.format('YYYY-MM-DD')
      const endOfWeek = moment().endOf('isoWeek').format('YYYY-MM-DD')

      let totalMinutes = 0

      for (
        let m = moment(startOfWeek);
        m.isSameOrBefore(endOfWeek, 'day');
        m.add(1, 'day')
      ) {
        const dateKey = m.format('YYYY-MM-DD')
        const dayMap = this.personTimeSpentMap[dateKey]
        if (dayMap) {
          Object.values(dayMap).forEach(timeSpent => {
            totalMinutes += timeSpent.duration || 0
          })
        }
      }

      return Math.round((totalMinutes / 60) * 10) / 10 // Round to 1 decimal
    },

    hoursLastWeek() {
      const startOfLastWeek = this.previousWeekStart.format('YYYY-MM-DD')
      const endOfLastWeek = moment()
        .subtract(1, 'week')
        .endOf('isoWeek')
        .format('YYYY-MM-DD')

      let totalMinutes = 0

      for (
        let m = moment(startOfLastWeek);
        m.isSameOrBefore(endOfLastWeek, 'day');
        m.add(1, 'day')
      ) {
        const dateKey = m.format('YYYY-MM-DD')
        const dayMap = this.personTimeSpentMap[dateKey]
        if (dayMap) {
          Object.values(dayMap).forEach(timeSpent => {
            totalMinutes += timeSpent.duration || 0
          })
        }
      }

      return Math.round((totalMinutes / 60) * 10) / 10
    },

    hoursWeekTrend() {
      if (this.hoursLastWeek === 0) return null

      // Account for partial week - adjust comparison based on days completed
      const currentDayOfWeek = moment().isoWeekday()
      const daysCompletedThisWeek = currentDayOfWeek
      const adjustedLastWeekHours =
        (this.hoursLastWeek / 7) * daysCompletedThisWeek

      if (this.hoursThisWeek > adjustedLastWeekHours * 1.05) return 'up'
      if (this.hoursThisWeek < adjustedLastWeekHours * 0.95) return 'down'
      return null
    },

    hoursThisWeekTooltip() {
      return `${this.hoursThisWeek} hours logged this week (${moment().format('dddd')})`
    },

    hoursTrendTooltip() {
      if (!this.hoursWeekTrend) return ''
      const trend = this.hoursWeekTrend === 'up' ? 'above' : 'below'
      return `${trend.charAt(0).toUpperCase() + trend.slice(1)} last week's pace (${this.hoursLastWeek}h for full week)`
    },

    tasksForReviewThisWeek() {
      return this.getTasksCountByStatusThisWeek(['wf'])
    },

    tasksValidatedThisWeek() {
      return this.getTasksCountByStatusThisWeek(['done', 'validated'])
    },

    tasksForReviewTooltip() {
      return `${this.tasksForReviewThisWeek} tasks sent for review this week`
    },

    tasksValidatedTooltip() {
      return `${this.tasksValidatedThisWeek} tasks validated this week`
    },

    completionRate() {
      const totalTasks = this.personTasks.length + this.personDoneTasks.length
      if (totalTasks === 0) return 0

      const completedTasks = this.personDoneTasks.length
      return Math.round((completedTasks / totalTasks) * 100)
    },

    completionRateTrend() {
      // This would need historical data to calculate properly
      // For now, return null (no trend indicator)
      return null
    },

    completionRateTooltip() {
      const totalTasks = this.personTasks.length + this.personDoneTasks.length
      return `${this.personDoneTasks.length} of ${totalTasks} total assigned tasks completed`
    },

    completionRateTrendTooltip() {
      return ''
    }
  },

  methods: {
    getTasksCountByStatusThisWeek(statusShortNames) {
      const startOfWeek = this.currentWeekStart
      const endOfWeek = moment().endOf('isoWeek')

      let count = 0

      // Check tasks that changed status this week
      const allTasks = [...this.personTasks, ...this.personDoneTasks]

      allTasks.forEach(task => {
        // Look for status that matches and was updated this week
        if (task.last_comment_date) {
          const lastUpdate = moment(task.last_comment_date)
          if (lastUpdate.isBetween(startOfWeek, endOfWeek, 'day', '[]')) {
            const taskStatus = this.taskStatusMap.get(task.task_status_id)
            if (
              taskStatus &&
              statusShortNames.includes(taskStatus.short_name)
            ) {
              count++
            }
          }
        }
      })

      return count
    }
  },

  watch: {
    personId: {
      immediate: true,
      handler() {
        if (this.personId) {
          // Data should already be loaded by parent component
          // This component just displays computed stats
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// .person-stats-ticker {
//   background: var(--background-panel);
//   border-radius: 8px;
//   padding: 1rem;
//   margin-bottom: 1.5rem;
//   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
// }

.stats-container {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  overflow-x: auto;

  @media screen and (max-width: 1024px) {
    gap: 1rem;
  }

  @media screen and (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
}

.ticker-stat {
  flex: 1;
  min-width: 180px;
  max-width: 220px;

  // Override the default Stat component styles for ticker layout
  :deep(.stat-widget) {
    padding: 0.75rem 1rem;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      border-color: var(--primary);
      transform: none; // Remove the lift effect for ticker
      box-shadow: 0 0 0 1px var(--primary-light);
    }
  }

  :deep(.stat-header) {
    margin-bottom: 0.25rem;
  }

  :deep(.stat-label) {
    font-size: 0.75rem;
    color: var(--text-light);
  }

  :deep(.stat-number) {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
  }

  :deep(.stat-unit) {
    font-size: 0.875rem;
  }

  :deep(.stat-description) {
    font-size: 0.75rem;
    line-height: 1.2;
    margin-top: 0.25rem;
  }

  :deep(.stat-trend) {
    margin-right: 0.25rem;

    .trend-arrow {
      font-size: 1rem;
    }
  }

  @media screen and (max-width: 768px) {
    min-width: 100%;
    max-width: 100%;
  }
}

// Dark theme support
.dark {
  .person-stats-ticker {
    background: var(--background-panel-dark);
    // box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .ticker-stat :deep(.stat-widget) {
    border-color: var(--border-dark);

    &:hover {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary-light);
    }
  }
}
</style>
