<template>
  <div class="person-news-stats">
    <div class="stats-header">
      <h3 class="stats-title">{{ $t('news-stats.title') }}</h3>
      <combobox
        class="unit-selector has-text-right"
        :label="$t('news-stats.count_mode')"
        :options="countModeOptions"
        v-model="unitMode"
      />
    </div>

    <!-- Year-to-date stats boxes -->
    <div class="avg-stats-container" v-if="avgStats.length > 0">
      <div class="avg-stats-grid">
        <stat
          v-for="stat in avgStats"
          :key="stat.key"
          :label="stat.label"
          :number="stat.average"
          :unit="stat.unit"
          :description="stat.description"
          :arrow="stat.trend"
          :number-tooltip="stat.numberTooltip"
          :trend-tooltip="stat.trendTooltip"
        />
      </div>
    </div>

    <div class="has-text-centered mt2" v-if="isLoading">
      <spinner />
    </div>

    <div v-else-if="statsRows.length > 0" class="stats-table-container">
      <table class="stats-table">
        <thead>
          <tr>
            <th class="production-task-type-header">
              {{ $t('main.production') }} {{ $t('news-stats.type') }}
            </th>
            <th
              v-for="week in weekLabels"
              :key="week.label"
              :class="[
                'week-header',
                { current: week.key === weekLabels[4].key }
              ]"
            >
              {{ week.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in statsRows"
            :key="row.key"
            class="stats-row clickable-row"
            @click="navigateToNewsStats(row)"
          >
            <td class="production-task-type">
              {{ row.productionName }}
              <br />
              - {{ row.taskTypeName }}
            </td>
            <td
              v-for="(week, index) in weekLabels"
              :key="index"
              :class="[
                'week-cell',
                { current: week.key === weekLabels[4].key }
              ]"
            >
              <div class="status-chips">
                <status-chip
                  v-for="(stat, statusId) in row.stats[week.key]"
                  :key="statusId"
                  :status="taskStatusMap.get(statusId)"
                  :initial="stat.initial_status"
                  :repeat="stat.repeat_status"
                  :count-mode="unitMode"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-stats">
      <p>{{ $t('news-stats.no_data') }}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import moment from 'moment-timezone'
import preferences from '@/lib/preferences'
import { timeMixin } from '@/components/mixins/time'

import Combobox from '@/components/widgets/Combobox.vue'
import Spinner from '@/components/widgets/Spinner.vue'
import Stat from '@/components/widgets/Stat.vue'
import StatusChip from '@/components/widgets/StatusChip.vue'

export default {
  name: 'person-status-stats',

  mixins: [timeMixin],

  components: {
    Combobox,
    Spinner,
    Stat,
    StatusChip
  },

  props: {
    personId: {
      type: String,
      required: true
    },
    productions: {
      type: Array,
      required: true
    }
  },

  data() {
    return {
      currentDate: moment(),
      isLoading: false,
      isError: false,
      includeZeroStats: true, // if true, include stats with 0 average and rows with only zeros
      productionStats: {},
      unitMode: 'nb_seconds',
      countModeOptions: [
        { label: this.$t('news-stats.frames'), value: 'nb_frames' },
        { label: this.$t('news-stats.seconds'), value: 'nb_seconds' },
        { label: this.$t('news-stats.count'), value: 'count' }
      ]
    }
  },

  computed: {
    ...mapGetters([
      'getProductionTaskStatuses',
      'productionMap',
      'taskStatusMap',
      'taskTypeMap',
      'user'
    ]),

    weekLabels() {
      const labels = []
      // Add last 4 weeks
      for (let i = 4; i > 0; i--) {
        const week = moment(this.currentDate).subtract(i, 'weeks')
        labels.push({
          label: `${this.$t('main.week')} ${week.week()}`,
          key: week.format('YYYY-WW')
        })
      }
      // Add current week
      labels.push({
        label: this.$t('news-stats.current_week'),
        key: this.currentDate.format('YYYY-WW')
      })
      return labels
    },

    avgStats() {
      const stats = []

      Object.entries(this.productionStats).forEach(
        ([productionId, productionData]) => {
          const production = this.productionMap.get(productionId)

          Object.entries(productionData).forEach(
            ([taskTypeId, taskTypeData]) => {
              const taskType = this.taskTypeMap.get(taskTypeId)
              const personData = taskTypeData[this.personId]
              if (!personData) return

              // Group by status
              const statusStats = {}
              Object.entries(personData).forEach(([weekKey, weekData]) => {
                // Only process weeks that have actual data
                if (!weekData || Object.keys(weekData).length === 0) return

                Object.entries(weekData).forEach(([statusId, statData]) => {
                  if (!statusStats[statusId]) {
                    statusStats[statusId] = {
                      totalInitial: 0,
                      weekCount: 0,
                      recentWeeks: [],
                      olderWeeks: [],
                      hasActualData: false
                    }
                  }

                  const value = statData.initial_status[this.unitMode] || 0
                  // Only count as having data if there are actual values or the structure exists
                  if (
                    statData.initial_status &&
                    (value > 0 || statData.initial_status[this.unitMode] === 0)
                  ) {
                    statusStats[statusId].totalInitial += value
                    statusStats[statusId].weekCount++
                    statusStats[statusId].hasActualData = true

                    // Store recent vs older weeks for trend calculation
                    const weekMoment = moment(weekKey, 'YYYY-WW')
                    const weeksAgo = this.currentDate.diff(weekMoment, 'weeks')

                    if (weeksAgo <= 4) {
                      statusStats[statusId].recentWeeks.push(value)
                    } else {
                      statusStats[statusId].olderWeeks.push(value)
                    }
                  }
                })
              })

              // Create stat entries for each status
              Object.entries(statusStats).forEach(([statusId, statData]) => {
                const unitLabel = this.getUnitLabel()
                const unitName = this.getUnitName()

                const status = this.taskStatusMap.get(statusId)
                if (
                  !status ||
                  statData.weekCount === 0 ||
                  !statData.hasActualData
                )
                  return

                const average = statData.totalInitial / statData.weekCount

                // Calculate trend
                let trend = null
                let trendTooltip = ''
                if (
                  statData.recentWeeks.length > 0 &&
                  statData.olderWeeks.length > 0
                ) {
                  const recentAvg =
                    statData.recentWeeks.reduce((a, b) => a + b, 0) /
                    statData.recentWeeks.length
                  const olderAvg =
                    statData.olderWeeks.reduce((a, b) => a + b, 0) /
                    statData.olderWeeks.length
                  trend = recentAvg > olderAvg ? 'up' : 'down'

                  if (trend === 'up') {
                    trendTooltip = this.$t('news-stats.trend_up', {
                      recentWeeks: statData.recentWeeks.length,
                      recentAvg: Math.round(recentAvg * 100) / 100,
                      olderWeeks: statData.olderWeeks.length,
                      olderAvg: Math.round(olderAvg * 100) / 100,
                      unitName: unitName
                    })
                  } else {
                    trendTooltip = this.$t('news-stats.trend_down', {
                      recentWeeks: statData.recentWeeks.length,
                      recentAvg: Math.round(recentAvg * 100) / 100,
                      olderWeeks: statData.olderWeeks.length,
                      olderAvg: Math.round(olderAvg * 100) / 100,
                      unitName: unitName
                    })
                  }
                }

                // Calculate date range for tooltip
                const sixMonthsAgo = moment(this.currentDate).subtract(
                  6,
                  'months'
                )
                const fourWeeksAgo = moment(this.currentDate)
                  .startOf('week')
                  .subtract(4, 'weeks')
                const fromDate = moment.min(sixMonthsAgo, fourWeeksAgo)
                const toDate = moment(this.currentDate).endOf('week')

                const numberTooltip = this.$t('news-stats.number_tooltip', {
                  totalInitial: Math.round(statData.totalInitial),
                  unitName: unitName,
                  fromDate: fromDate.format('MMM D, YYYY'),
                  toDate: toDate.format('MMM D, YYYY'),
                  weekCount: statData.weekCount
                })

                if (this.includeZeroStats || average > 0) {
                  // console.log('average', average)
                  stats.push({
                    key: `${productionId}-${taskTypeId}-${statusId}`,
                    label: status.name,
                    description: `${production?.name || ''} - ${taskType?.name || ''}`,
                    average: Math.round(average * 100) / 100,
                    unit: unitLabel,
                    trend: trend,
                    numberTooltip: numberTooltip,
                    trendTooltip: trendTooltip
                  })
                }
              })
            }
          )
        }
      )

      return stats.sort((a, b) => b.average - a.average) // Sort by average descending
    },

    statsRows() {
      const rows = []

      Object.entries(this.productionStats).forEach(
        ([productionId, productionData]) => {
          const production = this.productionMap.get(productionId)

          Object.entries(productionData).forEach(
            ([taskTypeId, taskTypeData]) => {
              const taskType = this.taskTypeMap.get(taskTypeId)
              const row = {
                key: `${productionId}_${taskTypeId}`,
                productionName: production?.name || 'Unknown',
                taskTypeName: taskType?.name || 'Unknown',
                stats: {},
                predictions: null
              }

              // nested by personId
              const personData = taskTypeData[this.personId]
              let hasData = false

              // Process each week's data
              this.weekLabels.forEach(week => {
                const weekStats = personData[week.key] || {}

                if (Object.keys(weekStats).length > 0) hasData = true
                row.stats[week.key] = weekStats

                // Calculate predictions for current week
                if (week.key === this.weekLabels[4].key) {
                  const currentDay = this.currentDate.day()
                  if (currentDay > 0 && currentDay < 6) {
                    // Only predict on weekdays
                    const total = this.calculateWeekTotal(weekStats)
                    const multiplier = 5 / currentDay // Assuming 5 working days
                    row.predictions = total * multiplier
                  }
                }
              })

              // if (!this.includeZeroStats && !hasData) return
              if (hasData) rows.push(row)
            }
          )
        }
      )
      return rows
    }
  },

  async mounted() {
    this.$nextTick(() => this.loadStats())
    this.loadUnitMode()
  },

  methods: {
    ...mapActions(['loadNewsStats']),

    getUnitLabel() {
      switch (this.unitMode) {
        case 'nb_frames':
          return 'frames/week'
        case 'nb_seconds':
          return 'sec/week'
        case 'count':
          return 'tasks/week'
        default:
          return 'units/week'
      }
    },

    getUnitName() {
      switch (this.unitMode) {
        case 'nb_frames':
          return 'frames'
        case 'nb_seconds':
          return 'seconds'
        case 'count':
          return 'tasks'
        default:
          return 'units'
      }
    },

    loadUnitMode() {
      const key = `person-news-stats:${this.personId}:unitMode`
      const savedMode = preferences.getPreference(key)
      if (savedMode) {
        this.unitMode = savedMode
      }
    },

    saveUnitMode() {
      const key = `person-news-stats:${this.personId}:unitMode`
      preferences.setPreference(key, this.unitMode)
    },

    formatPrediction(value) {
      return Math.round(value)
    },

    calculateWeekTotal(weekStats) {
      let total = 0
      Object.values(weekStats).forEach(stat => {
        total += stat.initial_status[this.unitMode] || 0
        total += stat.repeat_status[this.unitMode] || 0
      })
      return total
    },

    async loadStats() {
      if (this.isLoading) return

      if (!this.productions || !this.personId) {
        this.productionStats = {}
        this.productionStats = {}
        return
      }
      this.isLoading = true

      // get 6 months of weekly data to get a 6 month average
      const from = moment(this.currentDate)
        .startOf('week')
        .subtract(6, 'months')
      const to = moment(this.currentDate).endOf('week')

      for (const production of this.productions) {
        // get just status.id for the production filtered by is_feedback_request or is_done
        const statuses = this.getProductionTaskStatuses(production.id)
          .filter(
            status =>
              !status.for_concept &&
              (status.is_feedback_request || status.is_done)
          )
          .map(status => status.id)

        const params = {
          productionId: production.id,
          person_id: this.personId,
          task_status_id: statuses ? statuses.join(',') : undefined,
          detail: 'week',
          change: 1,
          timezone: moment.tz.guess(),
          after: this.formatDateAsUTC(from),
          before: this.formatDateAsUTC(to)
        }

        this.loadNewsStats(params)
          .then(data => (this.productionStats[production.id] = data))
          .catch(err => console.error(err))
          .finally(() => (this.isLoading = false))
      }

      this.isLoading = false
    },

    navigateToNewsStats(row) {
      // Extract production ID from the row key (format: productionId_taskTypeId)
      const productionId = row.key.split('_')[0]
      const taskStatusIds = []

      // Get all task status IDs from the row
      Object.entries(row.stats).forEach(([weekKey, weekData]) => {
        Object.entries(weekData).forEach(([statusId, statData]) => {
          if (!taskStatusIds.includes(statusId)) taskStatusIds.push(statusId)
        })
      })

      // Navigate to news-stats route with query parameters
      this.$router.push({
        name: 'news-stats-week',
        params: {
          production_id: productionId,
          year: this.currentDate.year()
        },
        query: {
          countMode: this.unitMode,
          personId: this.personId,
          taskStatusIds: taskStatusIds.join(','),
          tab: 'persons',
          view: 'stats'
        }
      })
    }
  },

  watch: {
    unitMode() {
      this.saveUnitMode()
    },

    personId() {
      this.loadStats()
    },

    productions() {
      this.loadStats()
    }
  }
}
</script>

<style lang="scss" scoped>
.person-news-stats {
  background-color: var(--background-panel);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.avg-stats-container {
  margin-bottom: 2rem;
}

.avg-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
}

.stats-title {
  font-weight: bold;
  font-size: 1rem;
  text-transform: uppercase;
  color: var(--text);
  margin: 0;
  flex-shrink: 0;
}

.unit-selector {
  text-align: right;
  margin-bottom: 0;
}

.stats-table-container {
  overflow-x: auto;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
}

.stats-table th,
.stats-table td {
  padding: 0.75rem;
  text-align: left;
  border-color: #25282e;
}

.stats-table th {
  background-color: var(--background-panel);
  font-weight: bold;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
}

.stats-table td {
  border-bottom: 1px solid var(--border);
}

.stats-table tbody tr:hover {
  background: var(--background-selectable-hover);
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clickable-row:hover {
  background: var(--background-selectable-hover) !important;
}

.production-task-type-header {
  width: 200px;
}

.week-header {
  width: 100px;
}

.week-cell {
  padding: 0.5rem;
  border-bottom: 1px solid var(--border);
  text-align: center;

  &.current {
    background-color: white;
  }
}

.production-task-type {
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

.status-chips {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.current-week {
  background-color: white;
}

.prediction {
  font-size: 0.8em;
  color: var(--text-grey);
  font-style: italic;
  margin-top: 0.5rem;
  padding: 0.25rem;
  background-color: var(--background-panel);
  border-radius: 4px;
}

.stat-chip-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

@media screen and (max-width: 1024px) {
  .avg-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .stats-table th,
  .stats-table td {
    padding: 0.5rem;
  }

  .week-cell {
    min-width: 80px;
  }

  .production-task-type {
    font-size: 0.8rem;
  }
}

@media screen and (max-width: 768px) {
  .avg-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .stats-table th,
  .stats-table td {
    padding: 0.5rem;
  }

  .week-cell {
    min-width: 60px;
  }
}

.loading-container,
.empty-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-grey);
  font-style: italic;
}

.dark {
  .stats-table {
    thead,
    tbody tr {
      color: var(--white-grey);
      background: #36393f;
    }
    thead th {
      color: var(--white-grey);
      background: #36393f;
      border-color: #666666;
    }
    thead th.week-header {
      text-align: center;
    }

    tbody td {
      border-color: #25282e;
    }

    .week-header.current,
    .week-cell.current {
      background-color: #46494f;
    }
  }
}
</style>
