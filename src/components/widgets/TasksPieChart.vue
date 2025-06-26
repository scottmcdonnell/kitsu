<template>
  <div class="tasks-pie-chart">
    <div class="chart-container">
      <h4 class="chart-title">{{ $t('tasks.status_breakdown') }}</h4>
      <div class="chart-wrapper">
        <div v-if="isLoading" class="has-text-centered">
          <spinner class="mt2" />
        </div>
        <pie-chart
          v-else-if="chartData.length > 0"
          :data="chartData"
          :colors="chartColors"
          height="300px"
          width="100%"
          :legend="false"
          :library="chartOptions"
          @click="handleChartClick"
        />
        <div v-else class="empty-chart">
          <p>{{ $t('people.no_task_assigned') }}</p>
        </div>
      </div>
    </div>

    <!-- Clickable status list below chart -->
    <div v-if="chartData.length > 0" class="status-list">
      <div
        v-for="status in Object.values(statusCounts)"
        :key="status.statusId"
        class="status-item"
        @click="handleStatusClick(status)"
      >
        <div
          class="status-color"
          :style="{ backgroundColor: status.color }"
        ></div>
        <span class="status-text">{{ status.name }} ({{ status.count }})</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Spinner from '@/components/widgets/Spinner.vue'

export default {
  name: 'tasks-pie-chart',

  components: {
    Spinner
  },

  props: {
    isLoading: {
      type: Boolean,
      default: false
    },
    tasks: {
      type: Array,
      required: true
    },
    onStatusClick: {
      type: Function,
      required: true
    }
  },

  computed: {
    ...mapGetters(['taskStatusMap']),

    statusCounts() {
      const counts = {}
      const totalTasks = this.tasks.length

      this.tasks.forEach(task => {
        const statusId = task.task_status_id
        const status = this.taskStatusMap.get(statusId)
        if (status) {
          const statusName = status.name
          if (!counts[statusId]) {
            counts[statusId] = {
              name: statusName,
              count: 0,
              color: status.color,
              short_name: status.short_name?.toUpperCase(),
              is_done: status.is_done || false,
              is_feedback_request: status.is_feedback_request || false,
              statusId: statusId
            }
          }
          counts[statusId].count++
        }
      })

      // Calculate percentages
      Object.values(counts).forEach(status => {
        status.percentage = ((status.count / totalTasks) * 100).toFixed(1)
      })

      return counts
    },

    chartData() {
      return Object.values(this.statusCounts).map(status => [
        status.name,
        status.count
      ])
    },

    chartColors() {
      return Object.values(this.statusCounts).map(status => status.color)
    },

    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              title: context => {
                return context[0].label
              },
              label: context => {
                const dataset = context.dataset
                const value = dataset.data[context.dataIndex]
                const total = dataset.data.reduce((a, b) => a + b, 0)
                const percentage = ((value / total) * 100).toFixed(1)
                return `${value} tasks (${percentage}%)`
              }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index
            const statusName = this.chartData[index][0]
            const status = Object.values(this.statusCounts).find(
              s => s.name === statusName
            )
            if (status) {
              this.handleStatusClick(status)
            }
          }
        }
      }
    }
  },

  methods: {
    handleStatusClick(status) {
      this.onStatusClick(status)
    },

    handleChartClick(point) {
      const statusName = point[0]
      const status = Object.values(this.statusCounts).find(
        s => s.name === statusName
      )
      if (status) {
        this.handleStatusClick(status)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.tasks-pie-chart {
  border-radius: 10px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  background-color: var(--background-panel);
  box-sizing: border-box;

  .chart-container {
    width: 100%;
    max-width: 100%;
    flex-shrink: 0;
  }

  .chart-wrapper {
    width: 100%;
    height: 300px;
    max-width: 100%;
    position: relative;
    overflow: hidden;

    :deep(canvas) {
      max-width: 100% !important;
      max-height: 300px !important;
    }
  }

  .chart-title {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 1rem;
    text-align: center;
    text-transform: uppercase;
    color: var(--text);
  }

  .empty-chart {
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-grey);
    font-style: italic;
  }

  .status-list {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    flex-shrink: 0;

    .status-item {
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 5px;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &:hover {
        background-color: var(--background-selectable-hover);
      }

      .status-color {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .status-text {
        font-size: 0.875rem;
        white-space: nowrap;
      }
    }
  }
}
</style>
