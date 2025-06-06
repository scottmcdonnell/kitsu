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
  name: 'status-stats',

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
      averageColumnX: '12rem'
    }
  },

  mounted() {
    if (this.shotMap.size < 2) {
      this.isLoading = true
      setTimeout(() => {
        this.loadShots(err => {
          if (!err) {
            this.loadData()
          }
        })
      }, 100)
    } else {
      if (!this.isShotsLoading) this.isLoading = false
      this.loadData()
    }
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'currentProduction',
      'isShotsLoading',
      'personMap',
      'shotMap',
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

    monthRange() {
      return getMonthRange(this.year, this.currentYear, this.currentMonth)
    },

    dayRange() {
      return getDayRange(
        this.year,
        this.month,
        this.currentYear,
        this.currentMonth
      )
    },

    weekRange() {
      return getWeekRange(this.year, this.currentYear, this.currentWeek)
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
        console.log('result', result)
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
    ...mapActions(['loadShots', 'getStatusStats', 'getStatusLogs']),

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
     * Restructure the api response to be grouped by person and detail level
     * @param stats - The stats to group
     * @param detailLevel - The detail level day/week/month
     * @returns The grouped stats
     * example day format:
     * {
     *   'person_id': {
     *     'YYYY-MM-DD': {
     *       'status_id': {
     *         first_take: 40,
     *         retake: 31
     *       }
     *     }
     *   }
     * }
     */
    groupStatsByPerson(stats, detailLevel = 'day') {
      return stats.reduce((groupedStats, stat) => {
        const personId = stat.person_id
        const timeKey = this.parseDateTime(stat.date, detailLevel)

        if (!groupedStats[personId]) groupedStats[personId] = {}
        if (!groupedStats[personId][timeKey])
          groupedStats[personId][timeKey] = {}

        if (!groupedStats[personId][timeKey][stat.task_status_id])
          groupedStats[personId][timeKey][stat.task_status_id] = {
            first_take: 0,
            retake: 0,
            date: timeKey
          }

        // Increment the appropriate counter
        if (stat.is_first) {
          groupedStats[personId][timeKey][stat.task_status_id].first_take +=
            stat.value
        } else {
          groupedStats[personId][timeKey][stat.task_status_id].retake +=
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
      console.log('loadData', this.taskTypeId, this.personId)

      if (this.taskTypeId || this.personId) {
        this.isLoading = true

        const year = this.year
        const month = this.detailLevel === 'day' ? this.month : null
        const { from, to } = getDateBoundaries(year, month)

        this.getStatusStats({
          taskTypeId: this.taskTypeId,
          taskStatusIds: this.taskStatusIds,
          personId: this.personId,
          detailLevel: this.detailLevel,
          countMode: this.countMode,
          userMode: this.userMode,
          from,
          to
        })
          .then(stats_list => {
            this.statsList = stats_list

            // Group stats by person and detail level
            this.statsMap = this.groupStatsByPerson(
              stats_list,
              this.detailLevel
            )
            console.log('statsMap', this.statsMap)
            this.statsLength = Object.keys(this.statsMap).length
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
            console.error(err)
          })
      }
    },

    loadDetails(row, column) {
      this.loadShots(err => {
        this.isLoading = true
        if (err) {
          console.error(err)
        } else {
          if (this.taskTypeId) {
            const year = this.year
            const month = this.month
            const week = this.detailLevel === 'week' ? column : null
            const day = this.detailLevel === 'day' ? column : null

            const { from, to } = getDateBoundaries(year, month, week, day)

            this.getStatusLogs({
              taskTypeId: this.taskTypeId,
              taskStatusIds: this.taskStatusIds,
              personId: this.personId,
              userMode: this.userMode,
              from,
              to
            }).then(logs => {
              this.detailsMap = logs
              this.isLoading = false
            })
          }
        }
      })
    },
    monthToString,

    dateDigit(date) {
      return date.toString().padStart(2, '0')
    },

    /**
     * Get the stats for a person and time period
     * @param key - The person id or 'total' for the total row
     * @param column - The time period, day number, week number, or month number or 'average' for the average column
     * @returns The stats for the person and time period
     */
    getStats(row, column) {
      // key will either be 'average' or the time header eg 1, 2, 3...

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

    calcPersonAverageAndTotals() {
      for (const [personId, personStats] of Object.entries(this.statsMap)) {
        const totals = {}

        // Initialize totals first
        for (const timeStats of Object.values(personStats)) {
          for (const [status_id, stat] of Object.entries(timeStats)) {
            if (!totals[status_id]) {
              totals[status_id] = {
                first_take: 0,
                first_take_count: 0,
                retake: 0,
                retake_count: 0
              }
            }
            totals[status_id].first_take += stat.first_take || 0
            totals[status_id].first_take_count += 1
            totals[status_id].retake += stat.retake || 0
            totals[status_id].retake_count += 1
          }
        }

        // Calculate averages
        const averages = {}
        for (const [status_id, total] of Object.entries(totals)) {
          averages[status_id] = {
            first_take: total.first_take_count
              ? total.first_take / total.first_take_count
              : 0,
            retake: total.retake_count ? total.retake / total.retake_count : 0
          }
        }
        this.statsMap[personId]['average'] = averages
        this.statsMap[personId]['totals'] = totals
      }
    },

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
      for (const stat of Object.values(stats)) {
        if (stat.first_take < this.maxStat) {
          return true
        }
      }
      return false
    },

    calcAverageColumnX() {
      if (this.statsLength > 0) {
        this.averageColumnX = `${this.$refs.rowHeaderName.offsetWidth}px`
      }
    },

    timeToString(time) {
      if (this.detailLevel === 'month') return monthToString(time)
      else return time
    },

    resetPersonIds() {
      const personIds = Object.keys(this.statsMap).filter(
        personId => personId !== 'total'
      )
      const persons = personIds.map(pId => this.personMap.get(pId))
      this.personIndex = buildNameIndex(persons)
      this.personIds = personIds
        .sort((a, b) => {
          const personAName = this.personMap.get(a).full_name
          const personBName = this.personMap.get(b).full_name
          return personAName.localeCompare(personBName)
        })
        .concat(['total'])
    },

    openDetail(row, column, query) {
      console.log('openDetail', row, column, query)
      //if (!stats) return
      const path = episodifyRoute({
        name: 'status-stats-day-person',
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
      })
      console.log('path', path)
      this.$router.push(path)
    },

    calcTotals() {
      const totals = {}

      // Iterate through all person_ids
      for (const personStats of Object.values(this.statsMap)) {
        // For each time period in this person's stats
        for (const [timePeriod, periodStats] of Object.entries(personStats)) {
          // init the object for this time period
          if (!totals[timePeriod]) totals[timePeriod] = {}

          // For each status in this time period
          for (const [statusId, stats] of Object.entries(periodStats)) {
            if (!totals[timePeriod][statusId]) {
              totals[timePeriod][statusId] = {
                first_take: 0,
                retake: 0,
                date: timePeriod
              }
            }

            // Sum up first_take and last_take
            totals[timePeriod][statusId].first_take += stats.first_take || 0
            totals[timePeriod][statusId].retake += stats.retake || 0
          }
        }
      }
      this.totalsMap = totals
    }
  },

  watch: {
    $route() {
      const els = document.getElementsByClassName('selected')
      if (els.length === 0) {
        // selected element is not visible
        setTimeout(() => {
          this.$refs.body.scrollLeft += 380
        }, 100)
      }
    },

    computeMode() {
      console.log('computeMode', this.taskTypeId, this.personId)
      if (this.taskTypeId || this.personId) {
        this.loadData()
      }
    },

    detailLevel() {
      console.log('detailLevel', this.taskTypeId, this.personId)
      if (this.taskTypeId || this.personId) {
        this.loadData()
      }
    },

    statsMap() {
      console.log('statsMap', this.taskTypeId, this.personId)
      if (this.taskTypeId) {
        this.resetPersonIds()
      }
    },

    taskTypeId() {
      console.log('taskTypeId', this.taskTypeId)
      if (this.taskTypeId) {
        this.loadData()
      }
    },

    taskStatusIds() {
      console.log('taskStatusIds', this.taskStatusIds)
      if (this.taskStatusIds.length > 0) {
        this.loadData()
      }
    },
    personId() {
      console.log('personId', this.personId)
      if (this.personId) {
        this.loadData()
      }
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
