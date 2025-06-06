<template>
  <div class="status-stats-charts">
    <h4 class="stats-title">{{ $t('status-stats.charts_title') }}</h4>

    <!-- Project Manager Stats Overview -->
    <div class="stats-overview" v-if="!isLoading && chartData.length > 0">
      <stat
        :label="$t('status-stats.total_work')"
        :number="totalCompletedWork"
        :unit="
          countMode === 'count'
            ? 'tasks'
            : countMode === 'nb_frames'
              ? 'frames'
              : 'seconds'
        "
        :description="$t('status-stats.total_work_desc')"
        :tooltip="$t('status-stats.total_work_tooltip')"
      />
      <stat
        :label="$t('status-stats.first_take_rate')"
        :number="firstTakeSuccessRate"
        unit="%"
        :description="$t('status-stats.efficiency_metric')"
        :tooltip="$t('status-stats.first_take_tooltip')"
        :arrow="
          firstTakeSuccessRate >= 70
            ? 'up'
            : firstTakeSuccessRate <= 40
              ? 'down'
              : null
        "
      />
      <stat
        :label="$t('status-stats.daily_average')"
        :number="averageDailyOutput"
        :unit="
          countMode === 'count'
            ? 'tasks/day'
            : countMode === 'nb_frames'
              ? 'frames/day'
              : 'seconds/day'
        "
        :description="$t('status-stats.productivity_metric')"
        :tooltip="$t('status-stats.daily_average_tooltip')"
      />
    </div>

    <div v-if="isLoading" class="loading-container">
      <p>{{ $t('main.loading') }}...</p>
    </div>

    <div v-else-if="chartData.length > 0" class="charts-container">
      <!-- Individual Person+Status Lines Chart -->
      <div class="chart-section" v-if="chartDatasets.length > 0">
        <h5 class="chart-subtitle">
          Individual Performance Lines (Person + Status)
        </h5>
        <line-chart
          :data="chartDatasets"
          :options="chartOptions"
          height="400px"
        />
      </div>

      <!-- Aggregated First Take Count over Time -->
      <div
        class="chart-section"
        v-if="Object.keys(firstTakeChartData).length > 0"
      >
        <h5 class="chart-subtitle">
          {{ $t('status-stats.first_take_timeline') }} (Aggregated)
        </h5>
        <line-chart
          :data="firstTakeChartData"
          :colors="firstTakeColors"
          height="300px"
          :library="chartOptions"
          :curve="false"
        />
      </div>

      <!-- First Take vs Retake Comparison -->
      <div class="chart-section" v-if="comparisonChartData.length > 0">
        <h5 class="chart-subtitle">{{ $t('status-stats.work_comparison') }}</h5>
        <line-chart
          :data="comparisonChartData"
          :options="chartOptions"
          height="300px"
        />
      </div>

      <!-- Rolling Average Performance -->
      <div class="chart-section" v-if="rollingAverageData.length > 0">
        <h5 class="chart-subtitle">
          {{ $t('status-stats.performance_trend') }}
        </h5>
        <line-chart
          :data="rollingAverageData"
          :options="chartOptions"
          height="300px"
        />
      </div>

      <!-- Top Performers Chart -->
      <div
        class="chart-section"
        v-if="showTopPerformers && topPerformersData.length > 0"
      >
        <h5 class="chart-subtitle">{{ $t('status-stats.top_performers') }}</h5>
        <column-chart
          :data="topPerformersData"
          :options="topPerformersOptions"
          height="300px"
        />
      </div>

      <!-- Show message if no chart data available -->
      <div
        v-if="Object.keys(firstTakeChartData).length === 0"
        class="empty-stats"
      >
        <p>{{ $t('status-stats.no_chart_data') }}</p>
      </div>
    </div>

    <div v-else class="empty-stats">
      <p>{{ $t('status-stats.no_chart_data') }}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import moment from 'moment-timezone'
import Stat from '@/components/widgets/Stat.vue'

export default {
  name: 'status-stats-charts',

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
    userMode: {
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
      chartData: [],
      processedData: null // Add this to store processed data
    }
  },

  computed: {
    ...mapGetters([
      'currentProduction',
      'taskStatusMap',
      'taskTypeMap',
      'personMap'
    ]),

    // First compute the time series data
    timeSeriesData() {
      // Structure: { person_id: { YYYY-MM-DD: { task_status_id: {first_take: 0, retake: 3, date: '2024-11-20'}}}}
      const statsMap = {}

      this.chartData.forEach(stat => {
        const personId = stat.person_id
        const statusId = stat.task_status_id
        const statDate = moment(stat.date)
        const dateKey = statDate.format('YYYY-MM-DD')

        // Initialize nested structure
        if (!statsMap[personId]) {
          statsMap[personId] = {}
        }
        if (!statsMap[personId][dateKey]) {
          statsMap[personId][dateKey] = {}
        }
        if (!statsMap[personId][dateKey][statusId]) {
          statsMap[personId][dateKey][statusId] = {
            first_take: 0,
            retake: 0,
            date: statDate.format('YYYY-MM-DD')
          }
        }

        // Aggregate values based on is_first flag
        const value = stat.value || 0
        if (stat.is_first) {
          statsMap[personId][dateKey][statusId].first_take += value
        } else {
          statsMap[personId][dateKey][statusId].retake += value
        }
      })

      console.log('timeSeriesData computed:', statsMap)
      return statsMap
    },

    // Then compute the chart datasets
    chartDatasets() {
      const statsMap = this.timeSeriesData
      if (!statsMap || Object.keys(statsMap).length === 0) {
        console.log('No data in statsMap')
        return []
      }

      const datasets = []
      const personStatusCombos = new Set()

      // First, collect all person+status combinations that have data
      Object.entries(statsMap).forEach(([personId, personData]) => {
        Object.entries(personData).forEach(([, dateData]) => {
          Object.entries(dateData).forEach(([statusId, statusData]) => {
            if (statusData) {
              personStatusCombos.add(`${personId}:${statusId}`)
            }
          })
        })
      })

      // Create datasets for each person+status combination
      Array.from(personStatusCombos).forEach(combo => {
        const [personId, statusId] = combo.split(':')
        const person = this.personMap.get(personId)
        const status = this.taskStatusMap.get(statusId)

        if (!person || !status) {
          console.log('Skipping invalid person/status:', { personId, statusId })
          return
        }

        // Create first take dataset
        const firstTakeData = {}
        // Create retake dataset
        const retakeData = {}

        // Collect data points
        Object.entries(statsMap[personId]).forEach(([date, dateData]) => {
          const statusData = dateData[statusId]
          if (statusData) {
            if (statusData.first_take) {
              firstTakeData[date] = statusData.first_take
            }
            if (statusData.retake) {
              retakeData[date] = statusData.retake
            }
          }
        })

        const personStatusLabel = `${person.full_name} - ${status.short_name}`

        // Add first take dataset if it has data
        if (Object.keys(firstTakeData).length > 0) {
          datasets.push({
            name: `${personStatusLabel} (First Take)`,
            data: firstTakeData
          })
        }

        // Add retake dataset if it has data
        if (Object.keys(retakeData).length > 0) {
          datasets.push({
            name: `${personStatusLabel} (Retake)`,
            data: retakeData
          })
        }
      })

      return datasets
    },

    // Aggregated first take data (sum across all people+statuses)
    firstTakeChartData() {
      const datasets = this.chartDatasets
      if (!datasets || datasets.length === 0) {
        return []
      }

      // Collect all dates and aggregate first take values
      const aggregatedData = {}

      datasets.forEach(dataset => {
        if (dataset.name.includes('First Take')) {
          Object.entries(dataset.data).forEach(([date, value]) => {
            aggregatedData[date] = (aggregatedData[date] || 0) + value
          })
        }
      })

      return [
        {
          name: this.$t('status-stats.first_take_count'),
          data: aggregatedData
        }
      ]
    },

    firstTakeColors() {
      return ['#28a745'] // Green for first takes (productive work)
    },

    // First Take vs Retake Comparison
    comparisonChartData() {
      const datasets = this.chartDatasets
      if (!datasets || datasets.length === 0) {
        return []
      }

      // Collect all dates and aggregate values
      const firstTakeData = {}
      const retakeData = {}

      datasets.forEach(dataset => {
        Object.entries(dataset.data).forEach(([date, value]) => {
          if (dataset.name.includes('First Take')) {
            firstTakeData[date] = (firstTakeData[date] || 0) + value
          } else if (dataset.name.includes('Retake')) {
            retakeData[date] = (retakeData[date] || 0) + value
          }
        })
      })

      return [
        {
          name: this.$t('status-stats.first_take_count'),
          data: firstTakeData
        },
        {
          name: this.$t('status-stats.retake_count'),
          data: retakeData
        }
      ]
    },

    comparisonColors() {
      return ['#28a745', '#ffc107'] // Green for first takes, amber for retakes
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
        let firstTakeTotal = 0
        let retakeTotal = 0

        datasets.forEach(dataset => {
          const value = dataset.data[date] || 0
          if (dataset.name.includes('First Take')) {
            firstTakeTotal += value
          } else if (dataset.name.includes('Retake')) {
            retakeTotal += value
          }
        })

        return {
          date,
          firstTake: firstTakeTotal,
          retake: retakeTotal
        }
      })

      // Calculate rolling averages
      const firstTakeAvg = {}
      const retakeAvg = {}

      for (let i = 0; i < dailyTotals.length; i++) {
        const startIdx = Math.max(0, i - rollingWindow + 1)
        const windowData = dailyTotals.slice(startIdx, i + 1)
        const date = dailyTotals[i].date

        firstTakeAvg[date] =
          Math.round(
            (windowData.reduce((sum, day) => sum + day.firstTake, 0) /
              windowData.length) *
              10
          ) / 10

        retakeAvg[date] =
          Math.round(
            (windowData.reduce((sum, day) => sum + day.retake, 0) /
              windowData.length) *
              10
          ) / 10
      }

      return [
        {
          name: this.$t('status-stats.avg_first_take'),
          data: firstTakeAvg
        },
        {
          name: this.$t('status-stats.avg_retake'),
          data: retakeAvg
        }
      ]
    },

    rollingAverageColors() {
      return ['#17a2b8', '#fd7e14'] // Blue for avg first takes, orange for avg retakes
    },

    // Show top performers chart only when looking at task types (multiple people)
    showTopPerformers() {
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
            performerTotals[personId] += statusData.first_take || 0
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
          data[person ? person.full_name : 'Unknown'] = total
        })

      return [
        {
          name: this.$t('status-stats.first_take_count'),
          data
        }
      ]
    },

    topPerformersColors() {
      return ['#6c757d'] // Gray for top performers
    },

    // Project Manager Stats
    totalCompletedWork() {
      if (!this.chartData || this.chartData.length === 0) return 0

      return this.chartData.reduce((total, stat) => {
        return total + (stat.value || 0)
      }, 0)
    },

    firstTakeSuccessRate() {
      if (!this.chartData || this.chartData.length === 0) return 0

      const firstTakeWork = this.chartData
        .filter(stat => stat.is_first)
        .reduce((total, stat) => total + (stat.value || 0), 0)

      const totalWork = this.totalCompletedWork

      if (totalWork === 0) return 0
      return Math.round((firstTakeWork / totalWork) * 100)
    },

    averageDailyOutput() {
      if (!this.chartData || this.chartData.length === 0) return 0

      // Get unique dates
      const uniqueDates = new Set(this.chartData.map(stat => stat.date))
      const totalDays = uniqueDates.size

      if (totalDays === 0) return 0
      return Math.round(this.totalCompletedWork / totalDays)
    },

    chartOptions() {
      return {
        colors: [
          '#28a745',
          '#dc3545',
          '#007bff',
          '#ffc107',
          '#6c757d',
          '#17a2b8',
          '#fd7e14',
          '#6f42c1',
          '#20c997',
          '#e83e8c'
        ],
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
    await this.loadChartData()
  },

  methods: {
    ...mapActions(['getStatusStats']),

    async loadChartData() {
      if (!this.currentProduction || (!this.taskTypeId && !this.personId)) {
        console.log('Early return - missing production or task/person:', {
          production: this.currentProduction,
          taskTypeId: this.taskTypeId,
          personId: this.personId
        })
        return
      }

      this.isLoading = true
      try {
        // Calculate date range - ensure we cover all the data we have
        const to = moment('2024-12-31')
        const from = moment('2024-09-01')

        console.log('Loading chart data with params:', {
          taskTypeId: this.taskTypeId,
          personId: this.personId,
          taskStatusIds: this.taskStatusIds,
          detailLevel: this.detailLevel,
          countMode: this.countMode,
          userMode: this.userMode,
          from: from.format('YYYY-MM-DD'),
          to: to.format('YYYY-MM-DD')
        })

        const statsList = await this.getStatusStats({
          taskTypeId: this.taskTypeId,
          personId: this.personId,
          taskStatusIds: this.taskStatusIds,
          detailLevel: 'day',
          countMode: this.countMode,
          userMode: this.userMode,
          from: from.format('YYYY-MM-DD'),
          to: to.format('YYYY-MM-DD')
        })

        console.log(
          'Raw stats data received:',
          JSON.stringify(statsList, null, 2)
        )

        // Filter and process the data
        this.chartData = statsList.filter(stat => {
          if (!stat.date || !stat.task_status_id || stat.value === undefined) {
            console.log('Dropping invalid stat:', stat)
            return false
          }

          if (this.taskStatusIds && this.taskStatusIds.length > 0) {
            const included = this.taskStatusIds.includes(stat.task_status_id)
            if (!included) {
              console.log('Dropping stat due to status filter:', stat)
            }
            return included
          }

          const status = this.taskStatusMap.get(stat.task_status_id)
          const isAllowed = status && status.is_artist_allowed
          if (!isAllowed) {
            console.log('Dropping stat due to not artist-allowed:', stat)
          }
          return isAllowed
        })

        console.log(
          'Processed chart data:',
          JSON.stringify(this.chartData, null, 2)
        )

        // Force computed properties to update
        this.$nextTick(() => {
          console.log('Computed timeSeriesData:', this.timeSeriesData)
          console.log('Computed chartDatasets:', this.chartDatasets)
        })
      } catch (error) {
        console.error('Failed to load chart data:', error)
        this.chartData = []
      } finally {
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
      this.loadChartData()
    },

    personId() {
      this.loadChartData()
    },

    taskStatusIds() {
      this.loadChartData()
    },

    detailLevel() {
      this.loadChartData()
    },

    countMode() {
      this.loadChartData()
    },

    userMode() {
      this.loadChartData()
    },

    year() {
      this.loadChartData()
    },

    month() {
      this.loadChartData()
    }
  }
}
</script>

<style lang="scss" scoped>
.status-stats-charts {
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
  .status-stats-charts {
    background-color: var(--background-panel-dark);
  }
}
</style>
