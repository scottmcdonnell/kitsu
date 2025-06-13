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
              {{ $t('news-stats.name') }}
            </th>
            <th
              scope="col"
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
            >
              {{ $t('news-stats.average') }}
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
import { sortTaskTypes } from '@/lib/sorting'

import {
  monthToString,
  getMonthRange,
  getWeekRange,
  getDayRange,
  getDateBoundaries
} from '@/lib/time'
import { timeMixin } from '@/components/mixins/time'

import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'
import StatusChip from '@/components/widgets/StatusChip.vue'

export default {
  name: 'news-stats',

  mixins: [timeMixin],

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
      isLoadingData: false,
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
      console.log('entryIds', this.personId)
      if (this.personId) return this.personTaskTypeIds
      else return this.filteredPersonIds
    },

    filteredPersonIds() {
      let personIds = this.personIds
      if (this.searchText.length > 0) {
        personIds = indexSearch(
          this.personIndex,
          this.searchText.split(' ')
        ).map(person => person.id)
      }
      console.log('filteredPersonIds', personIds)
      return personIds
    },

    personTaskTypeIds() {
      const taskTypeIds = sortTaskTypes(
        Object.keys(this.statsMap)
          .filter(key => key !== 'total')
          .map(taskTypeId => this.taskTypeMap.get(taskTypeId)),
        this.currentProduction
      ).map(taskType => taskType.id)

      // we only need a total row if we have more than 1 task type
      return taskTypeIds.length > 1
        ? taskTypeIds.concat(['total'])
        : taskTypeIds
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
     * Restructure the api response to be grouped by task_type > author > detail level
     * @param stats - The news stats to group
     * @param detailLevel - The detail level day/week/month
     * @returns The grouped stats
     * example day format:
     * {
     *   'task_type_id': {
     *     'author_id': {
     *       'YYYY-MM-DD': {
     *        'status_id': {
     *         first_take: 40,
     *         retake: 31
     *       }
     *     }
     *   }
     * }
     */
    groupStats(stats, detailLevel = 'day') {
      const value_key = this.countMode
      return stats.reduce((groupedStats, stat) => {
        const taskTypeId = stat.task_type_id
        const authorId = stat.author_id
        const timeKey = this.parseDateTime(stat.date, detailLevel)

        if (!groupedStats[taskTypeId]) groupedStats[taskTypeId] = {}
        if (!groupedStats[taskTypeId][authorId])
          groupedStats[taskTypeId][authorId] = {}
        if (!groupedStats[taskTypeId][authorId][timeKey])
          groupedStats[taskTypeId][authorId][timeKey] = {}

        if (!groupedStats[taskTypeId][authorId][timeKey][stat.task_status_id])
          groupedStats[taskTypeId][authorId][timeKey][stat.task_status_id] = {
            first_take: 0,
            retake: 0,
            date: timeKey
          }

        // For news data, we'll count based on initial_status
        // if true its the first occurance of the status for the task
        // if false its a retake of the status for the task
        if (stat.initial_status) {
          groupedStats[taskTypeId][authorId][timeKey][
            stat.task_status_id
          ].first_take += stat[value_key]
        } else {
          groupedStats[taskTypeId][authorId][timeKey][
            stat.task_status_id
          ].retake += stat[value_key]
        }
        return groupedStats
      }, {})
    },

    getPersonIds() {
      const personIds = []
      Object.keys(this.statsMap).forEach(taskTypeId => {
        Object.keys(this.statsMap[taskTypeId]).forEach(personId => {
          if (!personIds.includes(personId)) personIds.push(personId)
        })
      })
      return personIds
    },

    loadData() {
      if (!this.isLoadingData && (this.taskTypeId || this.personId)) {
        this.isLoading = this.isLoadingData = true

        const year = this.year
        const month = this.detailLevel === 'day' ? this.month : null
        const { from, to } = getDateBoundaries(year, month)

        this.loadNewsStats({
          productionId: this.currentProduction?.id,
          task_type_ids: this.taskTypeId || undefined,
          task_status_ids: this.taskStatusIds?.join(',') || undefined,
          person_ids: this.personId || undefined,
          detail: this.detailLevel,
          // we want only the changed statuses
          change: 1,
          // timezone for calulating the group by day/week/month correctly
          timezone: this.timezone, // eg. "Europe/London" "UTC"
          after: this.formatDateAsUTC(from),
          before: this.formatDateAsUTC(to)
        })
          .then(stats_list => {
            this.statsList = stats_list
            this.statsMap = this.groupStats(stats_list, this.detailLevel)
            this.personIds = this.getPersonIds()
            this.statsLength = this.personIds.length
            this.calcAverageColumnX()
            this.calcPersonAverageAndTotals()
            this.calcTotals()

            console.log('statsMap', this.statsMap)

            this.$nextTick(() => {
              this.isLoading = this.isLoadingData = false
            })
          })
          .catch(err => {
            this.statsMap = {}
            this.statsLength = 0
            this.calcAverageColumnX()
            this.isLoading = this.isLoadingData = false
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

      // if we are in person mode then the row is the task_type_id
      if (this.personId) {
        return this.statsMap?.[row]?.[this.personId]?.[column] || false
      }
      // other wise the row is the author_id
      else if (this.taskTypeId) {
        return this.statsMap?.[this.taskTypeId]?.[row]?.[column] || false
      }
      // else we have a problem
      else return false
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

    // isWeekend(dayNumber) {
    //   if (this.detailLevel !== 'day') return false
    //   const year = this.year
    //   const month = this.month
    //   const momentDate = moment(`${year}-${month}-${dayNumber}`, 'YYYY-MM-DD')
    //   return momentDate.day() === 0 || momentDate.day() === 6
    // },

    isSelected(personId, time) {
      switch (this.detailLevel) {
        case 'day':
          return this.isDaySelected(personId, this.year, this.month, time)
        case 'week':
          return this.isWeekSelected(personId, this.year, time)
        case 'month':
          return this.isMonthSelected(personId, this.year, time)
        default:
          throw new Error(`Invalid detail level: ${this.detailLevel}`)
      }
    },

    isDaySelected(personId, year, month, day) {
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + year &&
        '' + this.$route.params.month === '' + month &&
        '' + this.$route.params.day === '' + day
      )
    },

    isWeekSelected(personId, year, week) {
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + year &&
        '' + this.$route.params.week === '' + week
      )
    },

    isMonthSelected(personId, year, month) {
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + year &&
        '' + this.$route.params.month === '' + month
      )
    },

    isWeekend(time) {
      if (this.detailLevel !== 'day') return false

      const day = this.dateDigit(time)
      const date = moment(`${this.year}-${this.month}-${day}`, 'YYYY-MM-DD')
      return [0, 6].includes(date.day())
    },

    isStatLow(stats) {
      if (!stats || this.maxStat === 0) return false
      const totalValue = Object.values(stats).reduce((sum, stat) => {
        return sum + stat.first_take || 0
      }, 0)
      return totalValue < this.maxStat
    },

    openDetail(row, column, query) {
      if (row === 'total') return
      if (!column) return

      const route = {
        name: 'news-stats-day-person',
        params: {
          person_id: row,
          year: this.year,
          month: this.month,
          day: column
        },
        query: {
          ...query,
          taskTypeId: this.taskTypeId
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
      // Calculate averages for each person within each task type
      Object.keys(this.statsMap).forEach(taskTypeId => {
        const taskTypeStats = this.statsMap[taskTypeId]
        Object.keys(taskTypeStats).forEach(personId => {
          const personStats = taskTypeStats[personId]
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
                averageStats[statusId].first_take +=
                  dayStats[statusId].first_take
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

            this.statsMap[taskTypeId][personId]['average'] = averageStats
          }
        })
      })
    },

    calcTotals() {
      this.totalsMap = {}

      // Collect all time keys across all task types and persons
      const allTimeKeys = []
      Object.values(this.statsMap).forEach(taskTypeStats => {
        Object.values(taskTypeStats).forEach(personStats => {
          Object.keys(personStats).forEach(timeKey => {
            if (timeKey !== 'average') allTimeKeys.push(timeKey)
          })
        })
      })

      // Calculate totals for each time period
      allTimeKeys.forEach(timeKey => {
        const totals = {}

        // Sum up stats across all task types and persons
        Object.values(this.statsMap).forEach(taskTypeStats => {
          Object.values(taskTypeStats).forEach(personStats => {
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
.dark {
  .weekend {
    background-color: $dark-grey;
  }
  .info {
    color: $white;
  }
}

.data-list {
  margin-top: 0;
}

.datatable-wrapper {
  overflow: auto;
  margin-bottom: 1rem;
}

.datatable {
  min-width: auto;
  .name {
    min-width: 12rem;
    text-align: left;
    justify-content: flex-start;
    .avatar {
      margin-right: 0.5rem;
    }
  }
  .average {
    width: 8rem;
  }
  th,
  td {
    text-align: center;
  }
}

.datatable-head th {
  min-width: 4rem;
}

.datatable-body th {
  padding: 1rem;
}

.datatable-body {
  th,
  td {
    border: 0;
  }
}

.stats-button {
  border-radius: 0.5rem;
  padding: 0.5rem;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: inherit;
  font-size: inherit;
  &:hover,
  &:focus,
  &.is-selected {
    background-color: $dark-grey-lightest;
  }
}

.empty-stats {
  width: 100%;
}

.selected .stats-button {
  background: $purple;
  color: #333;
}
td.stat-low {
  background-color: rgba(255, 242, 65, 0.2);
}

.stats-button:hover {
  background: #bbeebb;
}
.stat-chip-container {
  .stat-chip {
    margin-bottom: 5px;
  }
  &:last-child {
    .stat-chip {
      margin-bottom: 0;
    }
  }
}

.weekend {
  background-color: $white-grey;
}
</style>
