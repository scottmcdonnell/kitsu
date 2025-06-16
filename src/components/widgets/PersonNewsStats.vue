<template>
  <div class="person-news-stats">
    <h4 class="stats-title">{{ $t('people.news_statistics') }}</h4>
    <div v-if="isLoading" class="loading-container">
      <p>{{ $t('main.loading') }}...</p>
    </div>
    <div v-else-if="newsStats.length > 0" class="news-stats-grid">
      <div v-for="stat in newsStats" :key="stat.news.id" class="news-stat-item">
        <div class="news-name">{{ stat.status.name }}</div>
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
      <p>{{ $t('people.no_news_stats') }}</p>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import moment from 'moment-timezone'

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
    },
    productions: {
      type: Array,
      required: true
    }
  },

  data() {
    return {
      isLoading: false,
      isError: false,
      statsMap: {},
      newsStats: []
    }
  },

  computed: {
    ...mapGetters(['currentProduction', 'taskStatusMap', 'user'])
  },

  async mounted() {
    await this.loadStats()
  },

  methods: {
    ...mapActions(['loadNewsStats']),

    async loadStats() {
      if (this.isLoading) return

      if (!this.productions || !this.personId) {
        this.statsMap = {}
        return
      }
      this.isLoading = true

      const stats = []

      for (const production of this.productions) {
        console.log('production', production)

        // Calculate date range for last 4 weeks
        const to = moment()
        const from = moment().startOf('week').subtract(4, 'weeks')

        const testing = true
        if (testing) console.log('TESTING in PersonNewsStats')

        const params = {
          productionId: this.currentProduction?.id,
          // task_status_id: this.taskStatusIds?.join(',') || undefined,
          person_id: this.personId,
          detail: 'week',
          // we want only the changed statuses
          change: 1,
          // timezone for calulating the group by day/week/month correctly
          timezone: this.timezone, // eg. "Europe/London" "UTC"
          after: testing ? '2024-12-01' : this.formatDateAsUTC(from),
          before: testing ? '2025-01-01' : this.formatDateAsUTC(to)
        }
        this.loadNewsStats(params).then(stats_list => {
          stats.push(...stats_list)
        })
      }

      this.statsMap = stats
      this.isLoading = false
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
