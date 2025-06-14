<template>
  <div class="people-news-stats-info">
    <div class="close">
      <router-link class="close-button" :to="closeRoute">
        <x-icon />
      </router-link>
    </div>

    <div class="flexrow">
      <people-avatar class="flexrow-item" :person="person" :is-lazy="false" />
      <page-title class="flexrow-item" :text="person.full_name" />
    </div>

    <div class="info-date" v-if="isMonthInfo">{{ monthString }} {{ year }}</div>
    <div class="info-date" v-else-if="isWeekInfo">
      {{ $t('main.week') }}
      {{ week }}, {{ startDay }} - {{ endDay }} {{ weekMonth }} {{ year }}
    </div>
    <div class="info-date" v-else-if="isDayInfo">
      {{ day }} {{ monthString }} {{ year }}
    </div>

    <div v-if="newsList.length === 0">{{ $t('news-stats.no_news') }}</div>
    <div v-else class="data-list">
      <table class="details table" v-if="!isLoading">
        <thead>
          <tr>
            <th v-if="!day">{{ $t('news-stats.date') }}</th>
            <th>{{ $t('news-stats.time') }}</th>
            <th>{{ $t('news-stats.name') }}</th>
            <th>{{ $t('news-stats.status') }}</th>
            <th v-if="countMode !== 'count'">
              {{ countModeLabel }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr :key="`news-${news.id}`" v-for="news in newsList">
            <td v-if="!day">
              {{ formatDate(news.created_at) }}
            </td>
            <td>{{ formatTime(news.created_at) }}</td>
            <td>
              <a @click="goToTask(news)">{{ news.full_entity_name }}</a>
            </td>
            <td>
              <validation-tag
                class="validation-tag"
                :task="buildTaskFromNews(news)"
                :is-static="true"
                :thin="!news.change"
                :is-initial="news.initial_status"
              />
            </td>
            <td v-if="countMode !== 'count'">{{ getNewsValue(news) }}</td>
          </tr>
        </tbody>
      </table>
      <table-info :is-loading="isLoading" :is-error="isLoadingError" />
    </div>
  </div>
</template>

<script>
import { XIcon } from 'lucide-vue-next'
import moment from 'moment-timezone'
import { mapGetters } from 'vuex'

import { monthToString } from '@/lib/time'
import { timeMixin } from '@/components/mixins/time'

import PageTitle from '@/components/widgets/PageTitle.vue'
import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'
import ValidationTag from '@/components/widgets/ValidationTag.vue'

export default {
  name: 'people-status-logs',

  mixins: [timeMixin],

  components: {
    XIcon,
    PageTitle,
    PeopleAvatar,
    TableInfo,
    ValidationTag
  },

  props: {
    person: {
      type: Object,
      default: () => {}
    },
    year: {
      type: Number,
      default: 0
    },
    month: {
      type: Number,
      default: 0
    },
    week: {
      type: Number,
      default: 0
    },
    day: {
      type: Number,
      default: 0
    },
    countMode: {
      type: String,
      default: 'frames'
    },
    detailLevel: {
      type: String,
      default: 'day'
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    isLoadingError: {
      type: Boolean,
      default: false
    },
    newsList: {
      type: Array,
      default: () => []
    }
  },

  emits: ['close'],

  computed: {
    ...mapGetters(['currentEpisode', 'currentProduction', 'taskStatusMap']),

    fps() {
      return this.currentProduction.fps
    },

    countModeLabel() {
      switch (this.countMode) {
        case 'nb_frames':
        default:
          return this.$t('news-stats.frames')
        case 'nb_seconds':
          return this.$t('news-stats.seconds')
        case 'nb_drawings':
          return this.$t('news-stats.drawings')
      }
    },
    startDay() {
      return moment().day('Monday').year(this.year).week(this.week).date()
    },

    endDay() {
      return moment()
        .day('Monday')
        .year(this.year)
        .week(this.week)
        .add(6, 'days')
        .date()
    },

    weekMonth() {
      return moment()
        .day('Monday')
        .year(this.year)
        .week(this.week)
        .format('MMM')
    },

    monthString() {
      return monthToString(this.month)
    },

    isMonthInfo() {
      return this.$route.path.indexOf('month') > 0
    },

    isWeekInfo() {
      return this.$route.path.indexOf('week') > 0
    },

    isDayInfo() {
      return this.$route.path.indexOf('day') > 0
    },

    closeRoute() {
      if (!this.currentProduction) return {}
      let route = {
        name: 'news-stats',
        production_id: this.currentProduction.id
      }
      if (this.isMonthInfo) {
        route = {
          name: 'news-stats-month',
          params: {
            year: this.year
          }
        }
      } else if (this.isWeekInfo) {
        route = {
          name: 'news-stats-week',
          params: {
            year: this.year
          }
        }
      } else if (this.isDayInfo) {
        route = {
          name: 'news-stats-day',
          params: {
            year: this.year,
            month: this.month
          }
        }
      }
      route.query = this.$route.query
      return route
    }
  },

  methods: {
    getNewsValue(news) {
      switch (this.countMode) {
        case 'nb_frames':
        default:
          return news.nb_frames || 0
        case 'nb_seconds':
          return (news.nb_frames / this.fps).toFixed(2) || '-'
        case 'nb_drawings':
          return news.nb_drawings || 0
      }
    },
    buildTaskFromNews(news) {
      return {
        id: news.task_id,
        task_status_id: news.task_status_id,
        task_type_id: news.task_type_id,
        episode_id: news.episode_id
      }
    },

    getTaskStatus(news) {
      return this.taskStatusMap.get(news?.task_status_id)
    },
    formatDate(date) {
      const localDate = moment.tz(date, 'UTC').tz(this.timezone)
      return localDate.format('Do MMM')
    },
    formatTime(date) {
      const localDate = moment.tz(date, 'UTC').tz(this.timezone)
      return localDate.format('HH:mm')
    },
    goToTask(news) {
      const route = {
        name: 'task',
        params: {
          task_id: news.task_id,
          type: news.task_type_id,
          production_id: news.project_id
        }
      }
      this.$router.push(route)
    },

    onCloseClicked() {
      this.$emit('close')
    }
  }
}
</script>

<style lang="scss" scoped>
.dark .close-button:hover {
  background: $dark-grey-lightest;
}

.data-list {
  padding-bottom: 5em;
}

.people-news-stats-info {
  border-left: 1px solid var(--border);
  height: 100%;
  padding: 1em;
}

.info-date {
  font-size: 1.5em;
  margin-top: 1em;
  text-transform: capitalize;
}

.close {
  text-align: right;
}

.close-button {
  cursor: pointer;
  display: inline-block;
  text-align: center;
  padding-top: 3px;
  width: 30px;
  height: 30px;
}

.close-button:hover {
  display: inline-block;
  background: $white-grey;
  border-radius: 50%;
}

.dark {
  header tr:hover {
    background: transparent;
  }

  .table {
    thead,
    tbody tr:nth-child(odd) {
      color: $white-grey;
      background: #36393f;
    }

    tbody tr:nth-child(even) {
      color: $white-grey;
      background: #46494f;
    }

    thead th,
    thead:hover {
      color: $white-grey;
      background: #36393f;
      border-color: #666666;
    }

    tbody td {
      border-color: #25282e;
    }

    tbody tr:hover {
      color: $white-grey;
      background: #5e6169;
    }
  }
}

tbody {
  tr:nth-child(even) {
    background: #f6f6f6;
  }

  tr:hover {
    background: $light-green-lightest;
  }
}
</style>
