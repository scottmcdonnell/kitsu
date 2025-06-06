<template>
  <div class="person-status-stats">
    <h4 class="stats-title">{{ $t('people.status_statistics') }}</h4>
    <div v-if="isLoading" class="loading-container">
      <p>{{ $t('main.loading') }}...</p>
    </div>
    <div v-else-if="statusStats.length > 0" class="status-stats-grid">
      <div
        v-for="stat in statusStats"
        :key="stat.status.id"
        class="status-stat-item"
      >
        <div class="status-name">{{ stat.status.name }}</div>
        <status-chip
          :status="stat.status"
          :first-take="stat.firstTake"
          :retake="stat.retake"
          :unit="''"
          :show-tooltip="true"
        />
      </div>
    </div>
    <div v-else class="empty-stats">
      <p>{{ $t('people.no_status_stats') }}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import moment from 'moment-timezone'

import { formatSimpleDate } from '@/lib/time'
import StatusChip from '@/components/widgets/StatusChip.vue'

export default {
  name: 'person-status-stats',

  components: {
    StatusChip
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
      statusStats: []
    }
  },

  computed: {
    ...mapGetters(['currentProduction', 'taskStatusMap', 'user'])
  },

  async mounted() {
    await this.loadStatusStats()
  },

  methods: {
    ...mapActions(['getStatusStats']),

    async loadStatusStats() {
      if (!this.currentProduction || !this.personId) {
        return
      }

      this.isLoading = true
      try {
        // Calculate date range for last 4 weeks
        const to = moment()
        const from = moment().subtract(4, 'weeks')

        const testing = true
        if (testing) console.log('TESTING in PersonStatusStats')

        const statsList = await this.getStatusStats({
          personId: this.personId,
          detailLevel: 'month',
          countMode: 'count',
          userMode: 'person',
          // TODO: remove this test data
          from: testing ? '2024-12-01' : formatSimpleDate(from),
          to: testing ? '2025-01-01' : formatSimpleDate(to)
        })

        // Process the stats to get totals by status
        const statusTotals = {}
        statsList.forEach(stat => {
          const statusId = stat.task_status_id
          if (!statusTotals[statusId]) {
            statusTotals[statusId] = {
              firstTake: 0,
              retake: 0
            }
          }

          if (stat.is_first) {
            statusTotals[statusId].firstTake += stat.value
          } else {
            statusTotals[statusId].retake += stat.value
          }
        })

        // Convert to display format
        this.statusStats = Object.entries(statusTotals)
          .map(([statusId, totals]) => {
            const status = this.taskStatusMap.get(statusId)
            return status
              ? {
                  status,
                  firstTake: totals.firstTake,
                  retake: totals.retake
                }
              : null
          })
          .filter(Boolean)
          .filter(stat => stat.status.is_artist_allowed)
          .sort((a, b) => a.status.priority - b.status.priority)
      } catch (error) {
        console.error('Failed to load status stats:', error)
        this.statusStats = []
      } finally {
        this.isLoading = false
      }
    }
  },

  watch: {
    personId() {
      this.loadStatusStats()
    },

    currentProduction() {
      this.loadStatusStats()
    }
  }
}
</script>

<style lang="scss" scoped>
.person-status-stats {
  background-color: var(--background-panel);
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  .stats-title {
    font-weight: bold;
    font-size: 1rem;
    margin-bottom: 1rem;
    text-align: center;
    text-transform: uppercase;
    color: var(--text);
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

  .status-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .status-stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background-color: var(--background);

    .status-name {
      font-weight: 500;
      margin-bottom: 0.5rem;
      text-align: center;
      color: var(--text);
      font-size: 0.9rem;
    }
  }
}

.dark {
  .status-stat-item {
    background-color: var(--background-dark);
    border-color: var(--border-dark);
  }
}
</style>
