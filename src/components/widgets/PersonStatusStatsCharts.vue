<template>
  <div class="person-status-stats-charts">
    <h4 class="stats-title">{{ $t('people.status_charts') }}</h4>

    <div v-if="isLoading" class="loading-container">
      <p>{{ $t('main.loading') }}...</p>
    </div>

    <div v-else-if="chartData.length > 0" class="charts-container">
      <!-- First Take Count per Week -->
      <div class="chart-section">
        <h5 class="chart-subtitle">{{ $t('people.first_take_weekly') }}</h5>
        <line-chart
          :data="firstTakeChartData"
          :colors="firstTakeColors"
          height="300px"
          :library="chartOptions"
          :curve="false"
        />
      </div>

      <!-- First Take vs Retake Comparison -->
      <div class="chart-section">
        <h5 class="chart-subtitle">{{ $t('people.work_comparison') }}</h5>
        <line-chart
          :data="comparisonChartData"
          :colors="comparisonColors"
          height="300px"
          :library="chartOptions"
          :curve="false"
        />
      </div>

      <!-- Rolling Average Performance -->
      <div class="chart-section">
        <h5 class="chart-subtitle">{{ $t('people.performance_trend') }}</h5>
        <line-chart
          :data="rollingAverageData"
          :colors="rollingAverageColors"
          height="300px"
          :library="rollingAverageOptions"
          :curve="true"
        />
      </div>
    </div>

    <div v-else class="empty-stats">
      <p>{{ $t('people.no_chart_data') }}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import moment from 'moment-timezone'
import { formatSimpleDate } from '@/lib/time'

export default {
  name: 'person-status-stats-charts',

  props: {
    personId: {
      type: String,
      required: true
    }
  },

  data() {
    return {
      isLoading: false,
      chartData: []
    }
  },

  computed: {
    ...mapGetters(['currentProduction', 'taskStatusMap', 'user']),

    // Group data by week and calculate totals
    weeklyData() {
      const weeklyTotals = {}

      this.chartData.forEach(stat => {
        const weekKey = moment(stat.date).startOf('week').format('YYYY-MM-DD')

        if (!weeklyTotals[weekKey]) {
          weeklyTotals[weekKey] = {
            week: weekKey,
            weekLabel: moment(weekKey).format('MMM DD'),
            firstTake: 0,
            retake: 0
          }
        }

        if (stat.is_first) {
          weeklyTotals[weekKey].firstTake += stat.value
        } else {
          weeklyTotals[weekKey].retake += stat.value
        }
      })

      return Object.values(weeklyTotals).sort((a, b) =>
        moment(a.week).diff(moment(b.week))
      )
    },

    // First take data for the main quota chart
    firstTakeChartData() {
      const data = {}
      data[this.$t('people.first_take_count')] = this.weeklyData.map(week => [
        week.weekLabel,
        week.firstTake
      ])
      return data
    },

    firstTakeColors() {
      return ['#28a745'] // Green for first takes (productive work)
    },

    // Comparison chart data
    comparisonChartData() {
      const data = {}
      data[this.$t('people.first_take_count')] = this.weeklyData.map(week => [
        week.weekLabel,
        week.firstTake
      ])
      data[this.$t('people.retake_count')] = this.weeklyData.map(week => [
        week.weekLabel,
        week.retake
      ])
      return data
    },

    comparisonColors() {
      return ['#28a745', '#ffc107'] // Green for first takes, amber for retakes
    },

    // Rolling average data (4-week rolling average)
    rollingAverageData() {
      const rollingWindow = 4
      const rollingData = []

      for (let i = 0; i < this.weeklyData.length; i++) {
        const startIdx = Math.max(0, i - rollingWindow + 1)
        const windowData = this.weeklyData.slice(startIdx, i + 1)

        const avgFirstTake =
          windowData.reduce((sum, week) => sum + week.firstTake, 0) /
          windowData.length
        const avgRetake =
          windowData.reduce((sum, week) => sum + week.retake, 0) /
          windowData.length

        rollingData.push({
          weekLabel: this.weeklyData[i].weekLabel,
          avgFirstTake: Math.round(avgFirstTake * 10) / 10,
          avgRetake: Math.round(avgRetake * 10) / 10
        })
      }

      const data = {}
      data[this.$t('people.avg_first_take')] = rollingData.map(week => [
        week.weekLabel,
        week.avgFirstTake
      ])
      data[this.$t('people.avg_retake')] = rollingData.map(week => [
        week.weekLabel,
        week.avgRetake
      ])
      return data
    },

    rollingAverageColors() {
      return ['#17a2b8', '#fd7e14'] // Blue for avg first takes, orange for avg retakes
    },

    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: context => {
                return `${context.dataset.label}: ${context.parsed.y} tasks`
              }
            }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
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
                return `${context.dataset.label}: ${context.parsed.y} avg tasks/week`
              }
            }
          }
        }
      }
    }
  },

  async mounted() {
    await this.loadChartData()
  },

  methods: {
    ...mapActions(['getStatusStats']),

    async loadChartData() {
      if (!this.currentProduction || !this.personId) {
        return
      }

      this.isLoading = true
      try {
        // Get data for the last 12 weeks to have enough for rolling average
        const to = moment()
        const from = moment().subtract(12, 'weeks')

        const statsList = await this.getStatusStats({
          personId: this.personId,
          detailLevel: 'day', // Get daily data to aggregate by week
          countMode: 'count',
          userMode: 'person',
          from: formatSimpleDate(from),
          to: formatSimpleDate(to)
        })

        // Filter only data from allowed statuses for artists
        this.chartData = statsList.filter(stat => {
          const status = this.taskStatusMap.get(stat.task_status_id)
          return status && status.is_artist_allowed
        })
      } catch (error) {
        console.error('Failed to load chart data:', error)
        this.chartData = []
      } finally {
        this.isLoading = false
      }
    }
  },

  watch: {
    personId() {
      this.loadChartData()
    },

    currentProduction() {
      this.loadChartData()
    }
  }
}
</script>

<style lang="scss" scoped>
.person-status-stats-charts {
  background-color: var(--background-panel);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  .stats-title {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 1.5rem;
    text-align: center;
    text-transform: uppercase;
    color: var(--text);
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
  .person-status-stats-charts {
    background-color: var(--background-panel-dark);
  }
}
</style>
