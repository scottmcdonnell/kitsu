<template>
  <div class="news-charts">
    <h4 class="stats-title">{{ $t('news-stats.charts_title') }}</h4>

    <!-- Project Manager Stats Overview -->
    <div
      class="stats-overview"
      v-if="!isLoading && Object.keys(statsData).length > 0"
    >
      <stat
        :label="$t('news-stats.total_work')"
        :number="totalCompletedWork"
        :unit="unitString"
        :number-tooltip="
          $t('news-stats.total_work_tooltip', {
            who: personId ? personMap.get(personId).full_name : 'the team',
            statusCount: taskStatusIds.length
          })
        "
      />
      <stat
        :label="$t('news-stats.initial_status_rate')"
        :number="initialStatusSuccessRate"
        unit="%"
        :number-tooltip="$t('news-stats.initial_status_rate_tooltip')"
        :arrow="
          initialStatusSuccessRate >= 30
            ? 'up'
            : initialStatusSuccessRate <= 20
              ? 'down'
              : null
        "
      />
      <stat
        :label="$t(`news-stats.${detailLevel}_average`)"
        :number="averageOutput"
        :unit="unitString"
        :number-tooltip="$t(`news-stats.${detailLevel}_average_tooltip`)"
      />
    </div>

    <div v-if="isLoading" class="loading-container">
      <p>{{ $t('main.loading') }}...</p>
    </div>

    <div v-else-if="Object.keys(statsData).length > 0" class="charts-container">
      <!-- Top Performers Chart -->
      <div
        class="chart-section"
        v-if="showTopPerformers && topPerformersData.length > 0"
      >
        <h5 class="chart-subtitle">{{ $t('news-stats.top_performers') }}</h5>
        <column-chart
          :data="topPerformersData"
          :options="topPerformersOptions"
          height="300px"
        />
      </div>

      <!-- All Users Comparison Chart -->
      <div
        class="chart-section"
        v-if="showAllUsersComparison && allUsersComparisonData.length > 0"
      >
        <h5 class="chart-subtitle">
          {{ $t('news-stats.all_users_comparison') }}
        </h5>
        <column-chart
          :data="allUsersComparisonData"
          :options="allUsersComparisonOptions"
          height="400px"
        />
      </div>

      <!-- Individual Person+Status Lines Chart -->
      <div class="chart-section" v-if="chartDatasets.length > 0">
        <h5 class="chart-subtitle">
          {{ $t('news-stats.individual_performance_lines') }}
        </h5>
        <line-chart
          :data="chartDatasets"
          :options="chartOptionsWithColors"
          height="400px"
        />
      </div>

      <!-- Aggregated First Take Count over Time -->
      <div
        class="chart-section"
        v-if="Object.keys(initialStatusChartData).length > 0"
      >
        <h5 class="chart-subtitle">
          {{ $t('news-stats.initial_status_timeline') }} (Aggregated)
        </h5>
        <line-chart
          :data="initialStatusChartData"
          :colors="initialStatusColors"
          height="300px"
          :library="chartOptions"
          :curve="false"
        />
      </div>

      <!-- First Take vs Retake Comparison -->
      <div class="chart-section" v-if="comparisonChartData.length > 0">
        <h5 class="chart-subtitle">{{ $t('news-stats.work_comparison') }}</h5>
        <line-chart
          :data="comparisonChartData"
          :options="chartOptions"
          height="300px"
        />
      </div>

      <!-- Rolling Average Performance -->
      <div class="chart-section" v-if="rollingAverageData.length > 0">
        <h5 class="chart-subtitle">
          {{ $t('news-stats.performance_trend') }}
        </h5>
        <line-chart
          :data="rollingAverageData"
          :options="chartOptions"
          height="300px"
        />
      </div>

      <!-- Show message if no chart data available -->
      <div
        v-if="Object.keys(initialStatusChartData).length === 0"
        class="empty-stats"
      >
        <p>{{ $t('news-stats.no_chart_data') }}</p>
      </div>
    </div>

    <div v-else class="empty-stats">
      <p>{{ $t('news-stats.no_chart_data') }}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import moment from 'moment-timezone'
import { getDateBoundaries } from '@/lib/time'
import { timeMixin } from '@/components/mixins/time'
import colors from '@/lib/colors'

import Stat from '@/components/widgets/Stat.vue'

export default {
  name: 'news-stats-charts',

  mixins: [timeMixin],

  components: {
    Stat
  },

  props: {
    taskStatusIds: {
      type: Array,
      required: true
    },
    taskTypeId: {
      type: String,
      required: false
    },
    personId: {
      type: String,
      required: false
    },
    detailLevel: {
      type: String,
      required: true
    },
    countMode: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      default: () => moment().year()
    },
    month: {
      type: Number,
      default: () => moment().month() + 1
    },
    week: {
      type: Number,
      default: () => moment().week()
    },
    day: {
      type: Number,
      default: () => moment().date()
    },
    searchText: {
      type: String,
      default: ''
    },
    maxStat: {
      default: 0
    }
  },

  data() {
    return {
      isLoading: false,
      statsData: {},
      lastParams: null
    }
  },

  computed: {
    ...mapGetters([
      'currentProduction',
      'taskStatusMap',
      'taskTypeMap',
      'personMap'
    ]),

    unitString() {
      return this.countMode === 'count'
        ? 'tasks/day'
        : this.countMode === 'nb_frames'
          ? 'frames/day'
          : 'seconds/day'
    },

    // First compute the time series data from the nested structure
    timeSeriesData() {
      // Input structure: { task_type_id: { author_id: { 'YYYY-MM-DD': { status_id: { initial_status: {...}, repeat_status: {...} }}}}}
      // Output structure: { person_id: { YYYY-MM-DD: { task_status_id: {initial_status: 0, repeat: 3, date: '2024-11-20'}}}}
      const statsMap = {}

      Object.entries(this.statsData).forEach(([taskTypeId, taskTypeData]) => {
        Object.entries(taskTypeData).forEach(([personId, personData]) => {
          Object.entries(personData).forEach(([dateKey, dateData]) => {
            Object.entries(dateData).forEach(([statusId, statusData]) => {
              // Initialize nested structure
              if (!statsMap[personId]) {
                statsMap[personId] = {}
              }
              if (!statsMap[personId][dateKey]) {
                statsMap[personId][dateKey] = {}
              }
              if (!statsMap[personId][dateKey][statusId]) {
                statsMap[personId][dateKey][statusId] = {
                  initial_status: 0,
                  repeat: 0,
                  date: dateKey
                }
              }

              // Extract values based on countMode
              const initialStatusValue =
                statusData.initial_status?.[this.countMode] || 0
              const repeatValue =
                statusData.repeat_status?.[this.countMode] || 0

              statsMap[personId][dateKey][statusId].initial_status +=
                initialStatusValue
              statsMap[personId][dateKey][statusId].repeat += repeatValue
            })
          })
        })
      })

      console.log('timeSeriesData computed:', statsMap)
      return statsMap
    },

    // Then compute the chart datasets - aggregated by status across all users
    chartDatasets() {
      try {
        const statsMap = this.timeSeriesData
        if (!statsMap || Object.keys(statsMap).length === 0) {
          console.log('No data in statsMap')
          return []
        }

        const datasets = []
        const statusTotals = {}

        // Collect all unique statuses and aggregate data across all users
        Object.entries(statsMap).forEach(([personId, personData]) => {
          Object.entries(personData).forEach(([date, dateData]) => {
            Object.entries(dateData).forEach(([statusId, statusData]) => {
              if (statusData) {
                // Initialize status tracking
                if (!statusTotals[statusId]) {
                  statusTotals[statusId] = {
                    initial: {},
                    repeat: {}
                  }
                }

                // Aggregate initial status data
                if (statusData.initial_status) {
                  statusTotals[statusId].initial[date] =
                    (statusTotals[statusId].initial[date] || 0) +
                    statusData.initial_status
                }

                // Aggregate repeat data
                if (statusData.repeat) {
                  statusTotals[statusId].repeat[date] =
                    (statusTotals[statusId].repeat[date] || 0) +
                    statusData.repeat
                }
              }
            })
          })
        })

        // Create datasets for each status
        Object.entries(statusTotals).forEach(([statusId, statusData]) => {
          const status = this.taskStatusMap.get(statusId)
          if (!status) {
            console.log('Skipping invalid status:', statusId)
            return
          }

          const statusColor = status.color || '#6c757d'

          // Add initial status dataset if it has data
          if (Object.keys(statusData.initial).length > 0) {
            const initialData = {}
            Object.entries(statusData.initial).forEach(([date, value]) => {
              initialData[date] = parseFloat(value.toFixed(2))
            })

            datasets.push({
              name: `${status.short_name.toUpperCase()} (${this.$t('news-stats.initial')})`,
              initial: true,
              data: initialData,
              color: statusColor
            })
          }

          // Add repeat dataset if it has data
          if (Object.keys(statusData.repeat).length > 0) {
            const repeatData = {}
            Object.entries(statusData.repeat).forEach(([date, value]) => {
              repeatData[date] = parseFloat(value.toFixed(2))
            })

            // Convert hex color to rgba with 40% alpha
            let rgbaColor
            try {
              const alphaColorObj = colors.alphaColor(statusColor, 0.4)
              rgbaColor =
                alphaColorObj.toString() ||
                alphaColorObj.toHexString() ||
                colors.hexToRGBa(statusColor, 0.4)
            } catch (error) {
              console.warn('Error creating alpha color:', error)
              rgbaColor = colors.hexToRGBa(statusColor, 0.4)
            }

            datasets.push({
              name: `${status.short_name.toUpperCase()} (${this.$t('news-stats.repeat')})`,
              initial: false,
              data: repeatData,
              color: rgbaColor
            })
          }
        })

        console.log('datasets', datasets)

        return datasets
      } catch (error) {
        console.error('Error creating chart datasets:', error)
        return []
      }
    },

    // Aggregated first take data (sum across all people+statuses)
    initialStatusChartData() {
      const datasets = this.chartDatasets
      if (!datasets || datasets.length === 0) {
        return []
      }

      // Collect all dates and aggregate first take values
      const aggregatedData = {}

      datasets.forEach(dataset => {
        if (dataset.initial) {
          Object.entries(dataset.data).forEach(([date, value]) => {
            aggregatedData[date] = parseFloat(
              ((aggregatedData[date] || 0) + value).toFixed(2)
            )
          })
        }
      })

      return [
        {
          name: this.$t('news-stats.initial_status_count'),
          data: aggregatedData
        }
      ]
    },

    initialStatusColors() {
      return ['#28a745'] // Green for first takes (productive work)
    },

    // First Take vs Retake Comparison
    comparisonChartData() {
      const datasets = this.chartDatasets
      if (!datasets || datasets.length === 0) {
        return []
      }

      // Collect all dates and aggregate values
      const initialStatusData = {}
      const repeatData = {}

      datasets.forEach(dataset => {
        Object.entries(dataset.data).forEach(([date, value]) => {
          if (dataset.initial) {
            initialStatusData[date] = parseFloat(
              ((initialStatusData[date] || 0) + value).toFixed(2)
            )
          } else {
            repeatData[date] = parseFloat(
              ((repeatData[date] || 0) + value).toFixed(2)
            )
          }
        })
      })

      return [
        {
          name: this.$t('news-stats.initial_status_count'),
          data: initialStatusData
        },
        {
          name: this.$t('news-stats.repeat_count'),
          data: repeatData
        }
      ]
    },

    comparisonColors() {
      return ['#28a745', '#ffc107'] // Green for first takes, amber for repeats
    },

    // Rolling average data (aggregated with smoothing)
    rollingAverageData() {
      const datasets = this.chartDatasets
      if (!datasets || datasets.length === 0) {
        return []
      }

      const rollingWindow = 4

      // First get all dates and sort them
      const allDates = new Set()
      datasets.forEach(dataset => {
        Object.keys(dataset.data).forEach(date => allDates.add(date))
      })
      const sortedDates = Array.from(allDates).sort()

      // Calculate daily totals
      const dailyTotals = sortedDates.map(date => {
        let initialStatusTotal = 0
        let repeatTotal = 0

        datasets.forEach(dataset => {
          const value = dataset.data[date] || 0
          if (dataset.initial) {
            initialStatusTotal += value
          } else {
            repeatTotal += value
          }
        })

        return {
          date,
          initialStatus: initialStatusTotal,
          repeat: repeatTotal
        }
      })

      // Calculate rolling averages
      const initialStatusAvg = {}
      const repeatAvg = {}

      for (let i = 0; i < dailyTotals.length; i++) {
        const startIdx = Math.max(0, i - rollingWindow + 1)
        const windowData = dailyTotals.slice(startIdx, i + 1)
        const date = dailyTotals[i].date

        initialStatusAvg[date] = parseFloat(
          (
            windowData.reduce((sum, day) => sum + day.initialStatus, 0) /
            windowData.length
          ).toFixed(2)
        )

        repeatAvg[date] = parseFloat(
          (
            windowData.reduce((sum, day) => sum + day.repeat, 0) /
            windowData.length
          ).toFixed(2)
        )
      }

      return [
        {
          name: this.$t('news-stats.avg_initial_status'),
          data: initialStatusAvg
        },
        {
          name: this.$t('news-stats.avg_repeat'),
          data: repeatAvg
        }
      ]
    },

    rollingAverageColors() {
      return ['#17a2b8', '#fd7e14'] // Blue for avg first takes, orange for avg repeats
    },

    // Show top performers chart only when looking at task types (multiple people)
    showTopPerformers() {
      return this.taskTypeId && !this.personId
    },

    // Show all users comparison chart when looking at task types (multiple people)
    showAllUsersComparison() {
      return this.taskTypeId && !this.personId
    },

    topPerformersOptions() {
      return {
        ...this.chartOptions,
        chart: {
          type: 'bar',
          height: 300
        },
        xaxis: {
          type: 'category'
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '55%',
            endingShape: 'rounded'
          }
        }
      }
    },

    // Top performers data
    topPerformersData() {
      if (!this.showTopPerformers) return []

      const performerTotals = {}

      // Iterate over the nested structure
      Object.entries(this.timeSeriesData).forEach(([personId, personData]) => {
        Object.values(personData).forEach(dateData => {
          Object.values(dateData).forEach(statusData => {
            if (!performerTotals[personId]) {
              performerTotals[personId] = 0
            }
            performerTotals[personId] += statusData.initial_status || 0
          })
        })
      })

      // Convert to chart.js format
      const data = {}
      Object.entries(performerTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10) // Top 10 performers
        .forEach(([personId, total]) => {
          const person = this.personMap.get(personId)
          data[person ? person.full_name : 'Unknown'] = parseFloat(
            total.toFixed(2)
          )
        })

      return [
        {
          name: this.$t('news-stats.initial_status_count'),
          data
        }
      ]
    },

    topPerformersColors() {
      return ['#6c757d'] // Gray for top performers
    },

    // All users comparison data - shows both initial and repeat for all users
    allUsersComparisonData() {
      if (!this.showAllUsersComparison) return []

      const performerTotals = {}

      // Iterate over the nested structure to collect totals
      Object.entries(this.timeSeriesData).forEach(([personId, personData]) => {
        Object.values(personData).forEach(dateData => {
          Object.values(dateData).forEach(statusData => {
            if (!performerTotals[personId]) {
              performerTotals[personId] = {
                initial: 0,
                repeat: 0
              }
            }
            performerTotals[personId].initial += statusData.initial_status || 0
            performerTotals[personId].repeat += statusData.repeat || 0
          })
        })
      })

      // Sort users by initial status value in descending order
      const sortedUsers = Object.entries(performerTotals).sort(
        ([, a], [, b]) => b.initial - a.initial
      )

      // Create data structure for column chart with two series
      const initialData = {}
      const repeatData = {}

      sortedUsers.forEach(([personId, totals]) => {
        const person = this.personMap.get(personId)
        const personName = person ? person.full_name : 'Unknown'
        initialData[personName] = parseFloat(totals.initial.toFixed(2))
        repeatData[personName] = parseFloat(totals.repeat.toFixed(2))
      })

      return [
        {
          name: this.$t('news-stats.initial_status_count'),
          data: initialData
        },
        {
          name: this.$t('news-stats.repeat_count'),
          data: repeatData
        }
      ]
    },

    allUsersComparisonOptions() {
      return {
        ...this.chartOptions,
        chart: {
          type: 'bar',
          height: 400
        },
        xaxis: {
          type: 'category'
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: '65%',
            endingShape: 'rounded'
          }
        },
        colors: ['#28a745', '#ffc107'] // Green for initial, amber for repeat
      }
    },

    // Project Manager Stats - updated to work with nested structure
    totalCompletedWork() {
      if (!this.statsData || Object.keys(this.statsData).length === 0) return 0

      let total = 0
      Object.values(this.statsData).forEach(taskTypeData => {
        Object.values(taskTypeData).forEach(personData => {
          Object.values(personData).forEach(dateData => {
            Object.values(dateData).forEach(statusData => {
              total += statusData.initial_status?.[this.countMode] || 0
              total += statusData.repeat_status?.[this.countMode] || 0
            })
          })
        })
      })

      return total.toFixed(1)
    },

    initialStatusSuccessRate() {
      if (!this.statsData || Object.keys(this.statsData).length === 0) return 0

      let initialStatusWork = 0
      let totalWork = 0

      Object.values(this.statsData).forEach(taskTypeData => {
        Object.values(taskTypeData).forEach(personData => {
          Object.values(personData).forEach(dateData => {
            Object.values(dateData).forEach(statusData => {
              const initialStatus =
                statusData.initial_status?.[this.countMode] || 0
              const repeat = statusData.repeat_status?.[this.countMode] || 0
              initialStatusWork += initialStatus
              totalWork += initialStatus + repeat
            })
          })
        })
      })

      if (totalWork === 0) return 0
      return Math.round((initialStatusWork / totalWork) * 100)
    },

    averageOutput() {
      if (!this.statsData || Object.keys(this.statsData).length === 0) return 0

      // Get unique dates across all data
      const uniqueDates = new Set()
      Object.values(this.statsData).forEach(taskTypeData => {
        Object.values(taskTypeData).forEach(personData => {
          Object.keys(personData).forEach(dateKey => {
            uniqueDates.add(dateKey)
          })
        })
      })

      const totalCount = uniqueDates.size
      if (totalCount === 0) return 0
      return (this.totalCompletedWork / totalCount).toFixed(1)
    },

    chartOptions() {
      return {
        chart: {
          type: 'line',
          height: 400
        },
        xaxis: {
          type: 'datetime'
        },
        stroke: {
          curve: 'smooth',
          width: 2
        },
        markers: {
          size: 4
        },
        line: {
          spanGaps: true
        }
      }
    },

    chartOptionsWithColors() {
      try {
        const colors = this.chartDatasets
          .map(dataset => dataset.color)
          .filter(color => color && typeof color === 'string')

        console.log('colors', colors)
        return {
          ...this.chartOptions,
          colors: colors.length > 0 ? colors : undefined
        }
      } catch (error) {
        console.warn('Error creating chart options with colors:', error)
        return this.chartOptions
      }
    },

    rollingAverageOptions() {
      return {
        ...this.chartOptions,
        plugins: {
          ...this.chartOptions.plugins,
          tooltip: {
            ...this.chartOptions.plugins.tooltip,
            callbacks: {
              label: context => {
                const unit =
                  this.countMode === 'count'
                    ? 'tasks'
                    : this.countMode === 'nb_frames'
                      ? 'frames'
                      : 'seconds'
                const period = this.detailLevel
                return `${context.dataset.name}: ${context.parsed.y} avg ${unit}/${period}`
              }
            }
          }
        }
      }
    }
  },

  async mounted() {
    console.log('mounted')
    await this.loadData()
  },

  methods: {
    ...mapActions(['loadNewsStats']),

    async stat(params) {
      // Use the same API call as NewsStats.vue
      const response = await this.$store.dispatch('loadNewsStats', params)
      return response
    },

    async loadData() {
      if (!this.currentProduction || (!this.taskTypeId && !this.personId)) {
        console.log('Early return - missing production or task/person:', {
          production: this.currentProduction,
          taskTypeId: this.taskTypeId,
          personId: this.personId
        })
        return
      }

      this.isLoading = true

      const year = this.year
      const month = this.detailLevel === 'day' ? this.month : null
      const { from, to } = getDateBoundaries(year, month)

      const params = {
        productionId: this.currentProduction?.id,
        task_type_id: this.taskTypeId || undefined,
        task_status_id: this.taskStatusIds?.join(',') || undefined,
        person_id: this.personId || undefined,
        detail: this.detailLevel,
        // we want only the changed statuses
        change: 1,
        // timezone for calulating the group by day/week/month correctly
        timezone: this.timezone, // eg. "Europe/London" "UTC"
        after: this.formatDateAsUTC(from),
        before: this.formatDateAsUTC(to)
      }

      // dont reload if the params are the same
      if (JSON.stringify(params) === JSON.stringify(this.lastParams)) {
        console.log('params are the same, skipping')
        this.isLoading = false
        return
      }
      console.log('params', params)

      this.lastParams = params

      try {
        const data = await this.stat(params)
        this.statsData = data
        console.log('statsData', this.statsData)
        this.isLoading = false
      } catch (error) {
        console.error('Error loading data:', error)
        this.statsData = {}
        this.isLoading = false
      }
    },

    formatTimeLabel(date) {
      if (this.detailLevel === 'day') {
        return date.format('MMM DD')
      } else if (this.detailLevel === 'week') {
        return date.format('[W]WW YYYY')
      } else {
        return date.format('MMM YYYY')
      }
    },

    formatDateLabel(dateKey) {
      const date = moment(dateKey, 'YYYY-MM-DD')
      // Always use the same format as the data
      return date.format('MMM DD')
    },

    generateColor(index) {
      // Generate distinct colors for each person+status combination
      const colors = [
        '#28a745',
        '#dc3545',
        '#007bff',
        '#ffc107',
        '#6c757d',
        '#17a2b8',
        '#fd7e14',
        '#6f42c1',
        '#20c997',
        '#e83e8c',
        '#795548',
        '#ff5722',
        '#9c27b0',
        '#3f51b5',
        '#00bcd4',
        '#4caf50',
        '#ffeb3b',
        '#ff9800',
        '#607d8b',
        '#f44336'
      ]
      return colors[index % colors.length]
    }
  },

  watch: {
    taskTypeId() {
      this.loadData()
    },

    personId() {
      this.loadData()
    },

    taskStatusIds() {
      this.loadData()
    },

    detailLevel() {
      this.loadData()
    },

    countMode() {
      this.loadData()
    },

    year() {
      this.loadData()
    },

    month() {
      this.loadData()
    }
  }
}
</script>

<style lang="scss" scoped>
.news-charts {
  background-color: var(--background-panel);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  flex: 1;
  min-height: 0; /* This is crucial for flex containers */
  overflow-y: auto;

  .stats-title {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 1.5rem;
    text-align: center;
    text-transform: uppercase;
    color: var(--text);
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding: 1rem 0;
  }

  .loading-container,
  .empty-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--text-grey);
    font-style: italic;
  }

  .charts-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    min-height: 0; /* This is crucial for flex containers */
  }

  .chart-section {
    .chart-subtitle {
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      text-align: center;
      color: var(--text);
      text-transform: capitalize;
    }
  }
}

.dark {
  .news-charts {
    background-color: var(--background-panel-dark);
  }
}
</style>
