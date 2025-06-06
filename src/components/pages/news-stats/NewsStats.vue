<template>
  <div class="data-list">
    <div class="datatable-wrapper" ref="body">
      <table class="datatable">
        <thead class="datatable-head">
          <tr>
            <th
              scope="col"
              class="name datatable-row-header"
              ref="rowHeaderName"
            >
              {{ $t('status-stats.name') }}
            </th>
            <th
              scope="col"
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
            >
              {{ $t('status-stats.average') }}
            </th>
            <th scope="col" :key="'time-' + time" v-for="time in timeRange">
              {{ timeToString(time) }}
            </th>
          </tr>
        </thead>
        <tbody class="datatable-body" v-if="statsLength > 0 && !isLoading">
          <tr
            :key="'name-' + key"
            class="datatable-row"
            v-for="key in entryIds"
          >
            <th scope="row" class="name datatable-row-header">
              <div class="flexrow" v-if="taskTypeId && key !== 'total'">
                <people-avatar :size="30" :person="personMap.get(key)" />
                {{ personMap.get(key).full_name }}
              </div>
              <div class="flexrow" v-else-if="taskTypeId && key === 'total'">
                {{ $t('main.total') }}
              </div>
              <div class="flexrow" v-else-if="personId && key !== 'total'">
                {{ taskTypeMap.get(key).name }}
              </div>
              <div class="flexrow" v-else-if="personId && key === 'total'">
                {{ $t('main.total') }}
              </div>
            </th>
            <td
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
              :set="stats = getStats(key, 'average')"
            >
              <span
                v-for="(stat, status_id) in stats"
                :key="key + '-' + status_id"
                class="stat-chip-container"
              >
                <status-chip
                  v-if="stat"
                  :status="taskStatusMap.get(status_id)"
                  :date="stat.date"
                  :first-take="stat.first_take"
                  :retake="stat.retake"
                  :unit="countMode"
                />
              </span>
            </td>
            <td
              :key="'time-' + time"
              v-for="time in timeRange"
              :set="stats = getStats(key, time)"
              :class="{
                weekend: isWeekend(time),
                selected: isSelected(key, time),
                'stat-low': isStatLow(stats)
              }"
            >
              <div
                v-if="stats"
                :class="{
                  'stats-button': key !== 'total'
                }"
                @click="openDetail(key, time, $route.query)"
              >
                <span
                  v-for="(stat, status_id) in stats"
                  :key="status_id"
                  class="stat-chip-container"
                >
                  <status-chip
                    v-if="stat"
                    :status="taskStatusMap.get(status_id)"
                    :date="stat.date"
                    :first-take="stat.first_take"
                    :retake="stat.retake"
                    :unit="countMode"
                  />
                </span>
              </div>
              <span v-else> - </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      class="has-text-centered empty-quota"
      v-if="statsLength === 0 && !isLoading"
    >
      <p class="info">{{ $t('quota.no_quota') }}</p>
    </div>

    <table-info :is-loading="isLoading" :is-error="isError" />
  </div>
</template>

<script>
import moment from 'moment-timezone'
import { mapGetters, mapActions } from 'vuex'

import { buildNameIndex, indexSearch } from '@/lib/indexing'
import { episodifyRoute } from '@/lib/path'
import { sortTaskTypes } from '@/lib/sorting'

import {
  monthToString,
  getMonthRange,
  getWeekRange,
  getDayRange,
  getDateBoundaries
} from '@/lib/time'

import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'
import StatusChip from '@/components/widgets/StatusChip.vue'

export default {
  name: 'news-stats',

  components: {
    PeopleAvatar,
    TableInfo,
    StatusChip
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
    searchText: {
      type: String,
      default: ''
    },
    maxStat: {
      default: 0
    },
    before: {
      type: String,
      default: null
    },
    after: {
      type: String,
      default: null
    }
  },

  data() {
    return {
      currentMonth: moment().month() + 1,
      currentYear: moment().year(),
      currentWeek: moment().week(),
      detailsMap: {},
      isLoading: true,
      isError: false,
      personIds: [],
      statsMap: {},
      totalsMap: {},
      statsLength: 0,
      averageColumnX: '12rem',
      personIndex: {}
    }
  },

  mounted() {
    this.loadData()
    this.setPersonIndex()
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'currentProduction',
      'personMap',
      'taskStatusMap',
      'taskTypeMap'
    ]),

    timeRange() {
      if (this.detailLevel === 'day') {
        return getDayRange(
          this.year,
          this.month,
          this.currentYear,
          this.currentMonth
        )
      } else if (this.detailLevel === 'week') {
        return getWeekRange(this.year, this.currentYear, this.currentWeek)
      } else {
        return getMonthRange(this.year, this.currentYear, this.currentMonth)
      }
    },

    entryIds() {
      if (this.personId) {
        const result = sortTaskTypes(
          Object.keys(this.taskTypeMap)
            .filter(key => key !== 'total')
            .map(taskTypeId => this.taskTypeMap.get(taskTypeId)),
          this.currentProduction
        )
          .map(taskType => taskType.id)
          .concat(['total'])
        return result
      } else {
        return this.filteredPersonIds
      }
    },

    filteredPersonIds() {
      let personIds = this.personIds
      if (this.searchText.length > 0) {
        personIds = indexSearch(
          this.personIndex,
          this.searchText.split(' ')
        ).map(person => person.id)
      }
      return personIds
    }
  },

  methods: {
    ...mapActions(['loadNewsStats', 'loadNews']),

    setPersonIndex() {
      this.personIndex = buildNameIndex(Array.from(this.personMap.values()))
    },

    /**
     * Parse the date and return the appropriate key for the detail level
     * @param datetime - The date to parse
     * @param detailLevel - The detail level day/week/month
     * @returns day: YYYY-MM-DD, week: YYYY-week, month: YYYY-MM
     * examples: day: 2025-04-14, week: 2025-15, month: 2025-04
     */
    parseDateTime(datetime, detailLevel) {
      const momentDate = moment(datetime)
      switch (detailLevel) {
        case 'day':
          return momentDate.format('YYYY-MM-DD')
        case 'week': {
          const weekNum = momentDate.isoWeek().toString().padStart(2, '0')
          return `${momentDate.year()}-${weekNum}`
        }
        case 'month':
          return momentDate.format('YYYY-MM')
        default:
          throw new Error(`Invalid detail level: ${detailLevel}`)
      }
    },

    getDateKey(opt) {
      let key = false
      if (opt.day) {
        key = `${opt.year}-${this.dateDigit(opt.month)}-${this.dateDigit(opt.day)}`
      } else if (opt.week) {
        key = `${opt.year}-${opt.week}`
      } else {
        key = `${opt.year}-${this.dateDigit(opt.month)}`
      }
      return key
    },

    /**
     * Restructure the api response to be grouped by person/author and detail level
     * @param stats - The news stats to group
     * @param detailLevel - The detail level day/week/month
     * @returns The grouped stats
     * example day format:
     * {
     *   'author_id': {
     *     'YYYY-MM-DD': {
     *       'status_id': {
     *         first_take: 40,
     *         retake: 31
     *       }
     *     }
     *   }
     * }
     */
    groupStatsByAuthor(stats, detailLevel = 'day') {
      return stats.reduce((groupedStats, stat) => {
        const authorId = stat.author_id
        const timeKey = this.parseDateTime(stat.created_at, detailLevel)

        if (!groupedStats[authorId]) groupedStats[authorId] = {}
        if (!groupedStats[authorId][timeKey])
          groupedStats[authorId][timeKey] = {}

        if (!groupedStats[authorId][timeKey][stat.task_status_id])
          groupedStats[authorId][timeKey][stat.task_status_id] = {
            first_take: 0,
            retake: 0,
            date: timeKey
          }

        // For news data, we'll count based on is_first_status
        if (stat.is_first_status) {
          groupedStats[authorId][timeKey][stat.task_status_id].first_take +=
            stat.value
        } else {
          groupedStats[authorId][timeKey][stat.task_status_id].retake +=
            stat.value
        }
        return groupedStats
      }, {})
    },

    episodifyRoute(route) {
      if (this.currentEpisode) {
        episodifyRoute(route, this.currentEpisode.id)
      }
      return route
    },

    loadData() {
      if (this.taskTypeId || this.personId) {
        this.isLoading = true

        const { from, to } = getDateBoundaries(
          this.year,
          this.month,
          this.week,
          this.day
        )

        this.loadNewsStats({
          taskTypeId: this.taskTypeId,
          taskStatusIds: this.taskStatusIds,
          personId: this.personId,
          detailLevel: this.detailLevel,
          countMode: this.countMode,
          userMode: this.userMode,
          from: this.after || from,
          to: this.before || to
        })
          .then(stats_list => {
            this.statsList = stats_list

            // Group stats by author and detail level
            this.statsMap = this.groupStatsByAuthor(
              stats_list,
              this.detailLevel
            )

            this.personIds = Object.keys(this.statsMap)
            this.statsLength = this.personIds.length
            this.calcAverageColumnX()
            this.calcPersonAverageAndTotals()
            this.calcTotals()

            this.$nextTick(() => {
              this.isLoading = false
            })
          })
          .catch(err => {
            this.statsMap = {}
            this.statsLength = 0
            this.calcAverageColumnX()
            this.isLoading = false
            this.isError = true
            console.error(err)
          })
      }
    },

    loadDetails(row, column) {
      this.isLoading = true
      const year = this.year
      const month = this.month
      const week = this.detailLevel === 'week' ? column : null
      const day = this.detailLevel === 'day' ? column : null

      const { from, to } = getDateBoundaries(year, month, week, day)

      const newsParams = {
        isStudio: false,
        productionId: this.currentProduction?.id,
        only_preview: false,
        page_size: 50,
        task_type_id: this.taskTypeId,
        task_status_id: this.taskStatusIds,
        person_id: row !== 'total' ? row : undefined,
        page: 1,
        before: to,
        after: from,
        only_first_status: true
      }

      this.loadNews(newsParams)
        .then(news => {
          this.detailsMap = news
          this.isLoading = false
        })
        .catch(err => {
          console.error(err)
          this.isLoading = false
        })
    },

    monthToString,

    dateDigit(date) {
      return date.toString().padStart(2, '0')
    },

    /**
     * Get the stats for a person and time period
     * @param key - The author id or 'total' for the total row
     * @param column - The time period, day number, week number, or month number or 'average' for the average column
     * @returns The stats for the person and time period
     */
    getStats(row, column) {
      // convert 1, 2, 3... to YYYY-MM-DD, YYYY-MM, YYYY-MM-DD
      if (column !== 'average') column = this.getDateKeyFromColumn(column)

      if (row === 'total' && column !== 'average') {
        return this.totalsMap[column] || false
      }

      if (!this.statsMap[row] || !this.statsMap[row][column]) return false
      return this.statsMap[row][column]
    },

    getDateKeyFromColumn(column) {
      const year = this.year
      let month = this.month
      let week
      let day

      switch (this.detailLevel) {
        case 'day':
          day = column
          return `${year}-${this.dateDigit(month)}-${this.dateDigit(day)}`
        case 'week':
          week = column
          return `${year}-${week}`
        case 'month':
          month = column
          return `${year}-${this.dateDigit(month)}`
      }
    },

    isWeekend(dayNumber) {
      if (this.detailLevel !== 'day') return false
      const year = this.year
      const month = this.month
      const momentDate = moment(`${year}-${month}-${dayNumber}`, 'YYYY-MM-DD')
      return momentDate.day() === 0 || momentDate.day() === 6
    },

    isSelected(key, column) {
      return false // TODO: implement selection state
    },

    isStatLow(stats) {
      if (!stats || this.maxStat === 0) return false
      const totalValue = Object.values(stats).reduce((sum, stat) => {
        return sum + (stat.first_take || 0) + (stat.retake || 0)
      }, 0)
      return totalValue < this.maxStat
    },

    openDetail(key, time, query) {
      if (key === 'total') return

      // Navigate to news feed with filters
      const route = {
        name: 'news-feed',
        query: {
          ...query,
          task_type_id: this.taskTypeId,
          task_status_id: this.taskStatusIds.join(','),
          person_id: key
        }
      }
      this.$router.push(route)
    },

    timeToString(time) {
      if (this.detailLevel === 'day') {
        return time.toString()
      } else if (this.detailLevel === 'week') {
        return `W${time}`
      } else {
        return monthToString(time)
      }
    },

    calcAverageColumnX() {
      if (this.$refs.rowHeaderName) {
        this.averageColumnX = `${this.$refs.rowHeaderName.offsetWidth}px`
      }
    },

    calcPersonAverageAndTotals() {
      // Calculate averages for each person
      Object.keys(this.statsMap).forEach(personId => {
        const personStats = this.statsMap[personId]
        const timeKeys = Object.keys(personStats).filter(
          key => key !== 'average'
        )

        if (timeKeys.length > 0) {
          const averageStats = {}

          // Calculate average for each status
          timeKeys.forEach(timeKey => {
            const dayStats = personStats[timeKey]
            Object.keys(dayStats).forEach(statusId => {
              if (!averageStats[statusId]) {
                averageStats[statusId] = {
                  first_take: 0,
                  retake: 0,
                  date: 'average'
                }
              }
              averageStats[statusId].first_take += dayStats[statusId].first_take
              averageStats[statusId].retake += dayStats[statusId].retake
            })
          })

          // Divide by number of days for average
          Object.keys(averageStats).forEach(statusId => {
            averageStats[statusId].first_take = Math.round(
              averageStats[statusId].first_take / timeKeys.length
            )
            averageStats[statusId].retake = Math.round(
              averageStats[statusId].retake / timeKeys.length
            )
          })

          this.statsMap[personId]['average'] = averageStats
        }
      })
    },

    calcTotals() {
      // Calculate totals across all persons for each time period
      const allTimeKeys = new Set()
      Object.values(this.statsMap).forEach(personStats => {
        Object.keys(personStats).forEach(timeKey => {
          if (timeKey !== 'average') allTimeKeys.add(timeKey)
        })
      })

      allTimeKeys.forEach(timeKey => {
        const totals = {}
        Object.values(this.statsMap).forEach(personStats => {
          if (personStats[timeKey]) {
            Object.keys(personStats[timeKey]).forEach(statusId => {
              if (!totals[statusId]) {
                totals[statusId] = { first_take: 0, retake: 0, date: timeKey }
              }
              totals[statusId].first_take +=
                personStats[timeKey][statusId].first_take
              totals[statusId].retake += personStats[timeKey][statusId].retake
            })
          }
        })
        if (Object.keys(totals).length > 0) {
          this.totalsMap[timeKey] = totals
        }
      })
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
    userMode() {
      this.loadData()
    },
    year() {
      this.loadData()
    },
    month() {
      this.loadData()
    },
    week() {
      this.loadData()
    },
    day() {
      this.loadData()
    },
    before() {
      this.loadData()
    },
    after() {
      this.loadData()
    }
  }
}
</script>

<style lang="scss" scoped>
.data-list {
  margin-top: 0;
  max-height: 100%;
  overflow-y: auto;
}

.datatable-wrapper {
  overflow-x: auto;
  overflow-y: auto;
}

.datatable {
  border-collapse: collapse;
  table-layout: fixed;
}

.datatable-head {
  color: var(--text);
  position: sticky;
  top: 0;
  background: var(--background-header);
  z-index: 2000;
}

.datatable-row-header {
  min-width: 12rem;
  position: sticky;
  left: 0;
  background: var(--background-header);
  z-index: 1000;
  border-right: 1px solid var(--border);
}

.name {
  min-width: 200px;
  width: 200px;
}

.average {
  min-width: 100px;
  width: 100px;
  z-index: 1500;
}

.datatable-row {
  background: var(--background);
  border-bottom: 1px solid var(--border-alt);

  &:hover {
    background: var(--background-hover);
  }
}

.datatable-body td {
  padding: 0.5rem;
  text-align: center;
  border-right: 1px solid var(--border-alt);
  min-width: 50px;
  width: 50px;
}

.weekend {
  background: var(--background-weekend);
}

.selected {
  background: var(--background-selected);
}

.stat-low {
  opacity: 0.6;
}

.stats-button {
  cursor: pointer;

  &:hover {
    background: var(--background-selectable);
  }
}

.stat-chip-container {
  display: inline-block;
  margin: 0.1rem;
}

.empty-quota {
  padding: 2rem;
}
</style>
