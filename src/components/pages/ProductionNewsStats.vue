<template>
  <div class="columns fixed-page">
    <div class="column main-column">
      <route-tabs :active-tab="activeTab" :tabs="tabs" />

      <div class="flexrow filters">
        <div class="flexrow-item" v-if="activeTab === 'tasktypes'">
          <combobox-task-type
            class="flexrow-item"
            :label="$t('news-stats.type')"
            :task-type-list="taskTypeList"
            :disabled="!params.person"
            v-model="params.taskTypeId"
          />
        </div>
        <people-field
          ref="person-field"
          class="person-field flexrow-item"
          :clearable="false"
          :disabled="isCurrentUserArtist"
          :label="$t('main.person')"
          :people="teamPersons"
          v-model="params.person"
          v-if="activeTab === 'persons'"
        />
        <combobox-statuses
          class="flexrow-item"
          :production-id="currentProduction.id"
          :label="$t('news-stats.status')"
          :statuses="taskStatuses"
          :multiple="true"
          v-model="params.taskStatusIds"
        />
        <combobox
          class="flexrow-item"
          :label="$t('news-stats.detail')"
          :options="detailLevelOptions"
          v-model="detailLevelString"
        />
        <combobox
          class="flexrow-item"
          :label="$t('news-stats.month')"
          :options="monthOptions"
          v-model="monthString"
          v-if="detailLevelString === 'day'"
        />
        <combobox
          class="flexrow-item"
          :label="$t('news-stats.year')"
          :options="yearOptions"
          v-model="yearString"
        />
        <combobox
          class="flexrow-item"
          :label="$t('news-stats.count_mode')"
          :options="countModeOptions"
          v-model="params.countMode"
        />
        <div class="filler"></div>
        <button-simple
          class="flexrow-item"
          :is-on="activeView === 'stats'"
          :title="$t('news-stats.stats')"
          icon="stats"
          @click="activeView = 'stats'"
        />
        <button-simple
          class="flexrow-item"
          :is-on="activeView === 'data-table'"
          :title="$t('news-stats.data_table')"
          icon="grid"
          @click="activeView = 'data-table'"
        />
        <button-simple
          class="flexrow-item"
          :is-on="activeView === 'charts'"
          :title="$t('news-stats.charts')"
          icon="chart"
          @click="activeView = 'charts'"
        />
      </div>

      <div class="flexrow mb2 mt0">
        <search-field
          ref="search-field"
          class="search-field flexrow-item"
          @change="onSearchChange"
          v-if="activeTab === 'tasktypes'"
        />

        <span class="label flexrow-item">
          {{ $t('news-stats.highlight_stats') }}
        </span>

        <text-field
          class="flexrow-item max-stats-input"
          type="number"
          :title="$t('news-stats.stat_low_tooltip', { maxStat })"
          v-model="maxStat"
        />
      </div>

      <news-stats
        v-if="activeView === 'stats'"
        ref="news-stat-list"
        :task-type-id="activeTab === 'tasktypes' ? params.taskTypeId : null"
        :person-id="
          activeTab === 'persons' && params.person ? params.person.id : null
        "
        :task-status-ids="params.taskStatusIds"
        :detail-level="detailLevelString"
        :year="year"
        :month="month"
        :week="week"
        :day="day"
        :count-mode="currentMode"
        :search-text="searchText"
        :max-stat="maxStat"
        :before="beforeDate"
        :after="afterDate"
      />
      <news-charts
        v-if="activeView === 'charts'"
        ref="news-charts"
        :task-type-id="activeTab === 'tasktypes' ? params.taskTypeId : null"
        :person-id="
          activeTab === 'persons' && params.person ? params.person.id : null
        "
        :task-status-ids="params.taskStatusIds"
        :detail-level="detailLevelString"
        :year="year"
        :month="month"
        :week="week"
        :day="day"
        :count-mode="params.countMode"
        :search-text="searchText"
        :max-stat="maxStat"
      />
      <news-data-table
        v-if="activeView === 'data-table'"
        ref="news-data-table"
        :task-type-id="activeTab === 'tasktypes' ? params.taskTypeId : null"
        :person-id="
          activeTab === 'persons' && params.person ? params.person.id : null
        "
        :task-status-ids="params.taskStatusIds"
        :detail-level="detailLevelString"
        :year="year"
        :month="month"
        :week="week"
        :day="day"
        :count-mode="params.countMode"
        :search-text="searchText"
        :max-stat="maxStat"
        :before="beforeDate"
        :after="afterDate"
      />
    </div>
    <div class="column side-column" v-if="showInfo && currentPerson">
      <people-news-stats-info
        :person="currentPerson"
        :year="year"
        :month="month"
        :week="week"
        :day="day"
        :is-loading="isNewsLoading"
        :is-loading-error="false"
        :news-list="newsList"
        :count-mode="params.countMode"
        :detail-level="detailLevel"
        @close="hideSideInfo"
      />
    </div>
  </div>
</template>

<script>
import moment from 'moment-timezone'
import { mapGetters, mapActions } from 'vuex'

import preferences from '@/lib/preferences'
import { monthToString, range, getDateBoundaries } from '@/lib/time'
import { sortPeople } from '@/lib/sorting'
import personStore from '@/store/modules/people'

import ButtonSimple from '@/components/widgets/ButtonSimple.vue'
import Combobox from '@/components/widgets/Combobox.vue'
import ComboboxStatuses from '@/components/widgets/ComboboxStatuses.vue'
import ComboboxTaskType from '@/components/widgets/ComboboxTaskType.vue'
import PeopleField from '@/components/widgets/PeopleField.vue'
import PeopleNewsStatsInfo from '@/components/sides/PeopleNewsStatsInfo.vue'
import NewsStats from '@/components/pages/news-stats/NewsStats.vue'
import NewsDataTable from '@/components/pages/news-stats/NewsDataTable.vue'
import NewsCharts from '@/components/pages/news-stats/NewsCharts.vue'
import RouteTabs from '@/components/widgets/RouteTabs.vue'
import SearchField from '@/components/widgets/SearchField.vue'
import TextField from '@/components/widgets/TextField.vue'
import { timeMixin } from '@/components/mixins/time'

const personMap = personStore.cache.personMap

export default {
  name: 'production-news-stats',

  mixins: [timeMixin],

  components: {
    ButtonSimple,
    Combobox,
    ComboboxStatuses,
    ComboboxTaskType,
    PeopleField,
    PeopleNewsStatsInfo,
    NewsStats,
    NewsDataTable,
    NewsCharts,
    RouteTabs,
    SearchField,
    TextField
  },

  data() {
    return {
      activeTab: 'tasktypes',
      activeView: 'stats', // stats, charts, or data-table
      tabs: [
        { name: 'tasktypes', label: this.$t('task_types.title') },
        { name: 'persons', label: this.$t('main.people') }
      ],
      countModeOptions: [
        { label: this.$t('news-stats.frames'), value: 'nb_frames' },
        { label: this.$t('news-stats.seconds'), value: 'nb_seconds' },
        { label: this.$t('news-stats.count'), value: 'count' }
      ],
      detailLevelOptions: [
        { label: this.$t('news-stats.day'), value: 'day' },
        { label: this.$t('news-stats.week'), value: 'week' },
        { label: this.$t('news-stats.month'), value: 'month' }
      ],

      // default values
      currentYear: moment().year(),
      currentMonth: moment().month() + 1,
      currentWeek: moment().week(),
      currentDay: moment().date(),
      currentPerson: this.getCurrentPerson(),
      currentMode: 'nb_frames',
      detailLevel: 'day',
      year: moment().year(),
      month: moment().month() + 1,
      week: null,
      day: null,

      isLoading: false,
      isNewsLoading: false,
      maxStat: 0,

      detailLevelString: 'day',
      monthString: `${moment().month() + 1}`,
      yearString: `${moment().year()}`,

      params: {
        countMode: 'nb_frames',
        person: null,
        taskStatusIds: [],
        taskTypeId: ''
      },
      personNews: [],
      silent: false,

      searchText: '',
      showInfo: false
    }
  },

  mounted() {
    this.setCountModeOptions()
    const key = `news-stats:${this.currentProduction.id}:params`
    const savedParams = preferences.getObjectPreference(key) || {}
    const defaultParams = {
      countMode: this.countModeOptions[0].value,
      taskTypeId: this.productionTaskTypes[0].id,
      taskStatusIds: []
    }
    this.activeTab = this.$route.query.tab || 'tasktypes'
    this.activeView = this.$route.query.view || 'stats'
    this.params = {
      countMode:
        this.$route.query.countMode ||
        savedParams.countMode ||
        defaultParams.countMode,
      taskTypeId: this.$route.query.taskTypeId,
      person: this.$route.query.personId
        ? personMap.get(this.$route.query.personId)
        : null,
      taskStatusIds:
        this.$route.query.taskStatusIds?.split(',') ||
        savedParams.taskStatusIds ||
        defaultParams.taskStatusIds
    }
    if (!this.params.taskTypeId && !this.params.person) {
      this.params.taskTypeId =
        savedParams.taskTypeId || defaultParams.taskTypeId
    }
    this.resetRouteQuery()
    this.loadRoute()
  },

  computed: {
    ...mapGetters([
      'newsList',
      'currentEpisode',
      'currentProduction',
      'getProductionTaskStatuses',
      'isCurrentUserArtist',
      'isPaperProduction',
      'productionTaskTypes'
    ]),

    taskTypeList() {
      return [...this.productionTaskTypes]
    },

    teamPersons() {
      if (this.isCurrentUserArtist) {
        return [personMap.get(this.user.id)]
      }
      return sortPeople(
        this.currentProduction.team.map(personId => personMap.get(personId))
      )
    },

    yearOptions() {
      const year = 2018
      return range(year, this.currentYear)
        .map(year => ({
          label: year,
          value: `${year}`
        }))
        .reverse()
    },

    monthOptions() {
      const month = 1
      let monthRange = range(month, 12)
      if (this.year === this.currentYear) {
        monthRange = range(month, this.currentMonth)
      }
      return monthRange.map(month => ({
        label: monthToString(month),
        value: `${month}`
      }))
    },

    taskStatuses() {
      const statuses = this.getProductionTaskStatuses(
        this.currentProduction.id
      ).filter(status => !status.for_concept)
      return statuses
    },

    beforeDate() {
      const boundaries = getDateBoundaries(
        this.year,
        this.month,
        this.week,
        this.day
      )
      return this.formatDateAsUTC(boundaries.to)
    },

    afterDate() {
      const boundaries = getDateBoundaries(
        this.year,
        this.month,
        this.week,
        this.day
      )
      return this.formatDateAsUTC(boundaries.from)
    }
  },

  methods: {
    ...mapActions(['loadNews', 'loadNewsStats', 'loadShots']),

    getCurrentPerson() {
      const personId = this.$route.params.person_id
      return personMap.get(personId) || {}
    },

    loadRoute() {
      const { month, year, week, day } = this.$route.params
      const { countMode, taskTypeId, taskStatusIds } = this.$route.query

      if (this.$route.path.indexOf('week') > 0) this.detailLevel = 'week'
      if (this.$route.path.indexOf('month') > 0) this.detailLevel = 'month'
      if (this.$route.path.indexOf('day') > 0) this.detailLevel = 'day'

      this.currentPerson = this.getCurrentPerson()
      this.detailLevelString = this.detailLevel
      if (countMode) {
        this.countMode = countMode
        this.currentMode = this.params.countMode
      }
      if (taskTypeId) {
        this.params.taskTypeId = taskTypeId
      }
      if (this.$route.query.personId) {
        this.params.person = personMap.get(this.$route.query.personId)
      }
      if (taskStatusIds) {
        const ids = taskStatusIds?.split(',') || []
        // only update if changed otherwise it will trigger a watch
        const idsEqual = ids.every(id => this.params.taskStatusIds.includes(id))
        if (!idsEqual) this.params.taskStatusIds = ids
      }
      if (month) {
        this.month = Number(month)
        this.monthString = `${month}`
      }
      if (year) {
        this.year = Number(year)
        this.yearString = `${year}`
      }
      if (week) {
        this.week = Number(week)
        this.weekString = `${week}`
      }
      if (day) this.day = Number(day)

      if (this.$route.path.indexOf('person') > 0) {
        this.loadSideInfoNews()
      } else {
        this.hideSideInfo()
      }
    },
    loadSideInfoNews() {
      if (this.isNewsLoading) return
      this.isNewsLoading = true
      const person_id = this.getCurrentPerson()?.id
      const task_status_id =
        this.params.taskStatusIds.length > 0
          ? this.params.taskStatusIds.join(',')
          : undefined
      const queryParams = {
        isStudio: false,
        productionId: this.currentProduction?.id,
        only_preview: false,
        page_size: 1000000,
        task_type_id: this.params.taskTypeId,
        task_status_id: task_status_id,
        person_id: person_id,
        change: 1, // only get changed statuses
        page: 1,
        before: this.beforeDate,
        after: this.afterDate
      }

      this.loadNews(queryParams)
        .then(() => {
          this.isNewsLoading = false
          this.showSideInfo()
        })
        .catch(() => {
          this.isNewsLoading = false
        })
    },
    showSideInfo() {
      this.showInfo = true
    },

    hideSideInfo() {
      this.showInfo = false
    },

    onSearchChange(searchText) {
      this.searchText = searchText
    },

    setCountModeOptions() {
      if (this.isPaperProduction) {
        this.countModeOptions = [
          { label: this.$t('news-stats.drawings'), value: 'nb_drawings' },
          { label: this.$t('news-stats.count'), value: 'count' }
        ]
        this.countMode = 'nb_drawings'
        this.currentMode = this.params.countMode
      } else {
        this.countModeOptions = [
          { label: this.$t('news-stats.frames'), value: 'nb_frames' },
          { label: this.$t('news-stats.seconds'), value: 'nb_seconds' },
          { label: this.$t('news-stats.count'), value: 'count' }
        ]
        this.params.countMode = 'nb_frames'
        this.currentMode = this.params.countMode
      }
    },

    resetRouteQuery() {
      const query = this.getQuery()
      const key = `news-stats:${this.currentProduction.id}:params`
      preferences.setObjectPreference(key, this.params)
      console.log('query', query)
      this.$router.push({ query })
    },

    getQuery() {
      const taskTypeId =
        this.activeTab === 'tasktypes' ? this.params.taskTypeId : undefined
      let personId = null
      const isPersonTab =
        this.activeTab === 'persons' || this.$route.query.tab === 'persons'
      if (isPersonTab && this.params.person) {
        personId = this.params.person.id
      } else if (isPersonTab) {
        personId = this.teamPersons[0]?.id
      }

      const query = {
        countMode: this.params.countMode,
        taskStatusIds: this.params.taskStatusIds.join(',') || undefined,
        tab: this.activeTab || 'tasktypes',
        view: this.activeView || 'stats',
        taskTypeId: taskTypeId || undefined,
        personId: personId || undefined
      }
      return query
    }
  },

  watch: {
    'params.person'() {
      if (!this.silent) {
        this.silent = true
        this.resetRouteQuery()
        setTimeout(() => {
          this.silent = false
        }, 100)
      }
    },
    detailLevelString() {
      if (this.detailLevel !== this.detailLevelString) {
        const route = {
          name: `news-stats-${this.detailLevelString}`,
          params: { year: this.year },
          query: this.getQuery()
        }
        if (this.detailLevelString === 'day') {
          if (!this.month)
            this.month = this.year === this.currentYear ? this.currentMonth : 1
          route.params.month = this.month
        }
        this.$router.push(route)
      }
    },

    yearString() {
      const year = Number(this.yearString)
      if (this.year !== year) {
        const route = {
          name: `news-stats-${this.detailLevelString}`,
          params: { year },
          query: this.getQuery()
        }
        if (year === this.currentYear && this.detailLevelString === 'day') {
          route.params.month = `${Math.min(this.month, this.currentMonth)}`
        }
        this.$router.push(route)
      }
    },

    monthString() {
      const month = Number(this.monthString)
      if (this.month !== month) {
        const route = {
          name: 'news-stats-day',
          params: { year: this.year, month },
          query: this.getQuery()
        }
        this.$router.push(route)
      }
    },

    activeView() {
      this.resetRouteQuery()
    },

    'params.countMode'() {
      this.resetRouteQuery()
      this.currentMode = this.params.countMode
    },

    'params.taskTypeId'() {
      if (!this.silent && this.params.taskTypeId) {
        this.silent = true
        this.resetRouteQuery()
        setTimeout(() => {
          this.silent = false
        }, 100)
      }
    },

    'params.taskStatusIds'() {
      if (this.$route.query.taskStatusIds !== this.params.taskStatusIds) {
        this.silent = true
        this.resetRouteQuery()
        setTimeout(() => {
          this.silent = false
        }, 100)
      }
    },

    currentProduction() {
      this.setCountModeOptions()
      this.isLoading = true
      this.loadShots(() => {
        this.resetRouteQuery()
        this.loadRoute()
        this.isLoading = false
      })
    },

    currentEpisode() {
      this.isLoading = true
      this.loadShots(() => {
        this.resetRouteQuery()
        this.loadRoute()
        this.isLoading = false
      })
    },

    $route() {
      this.activeTab = this.$route.query.tab || 'tasktypes'
      this.activeView = this.$route.query.view || 'stats'
      this.resetRouteQuery()
      this.loadRoute()
    }
  },

  head() {
    const prodName = this.currentProduction.name
    return {
      title: `${prodName} | ${this.$t('news.stats_title')} - Kitsu`
    }
  }
}
</script>

<style lang="scss" scoped>
.dark {
  .filters {
    color: $white-grey;
  }
}

.filters {
  flex: 0 0 auto;
  padding-bottom: 2rem;

  .field {
    padding-bottom: 0;
    margin-bottom: 0;
    .label {
      padding-top: 0;
    }
  }

  .overall-man-days {
    width: 120px;
    font-size: 0.9em;
    margin-right: 1em;
  }
}

.fixed-page {
  padding-top: 60px;
  padding-left: 2em;
}

.main-column {
  border: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding-top: 2em;
  padding-right: 2em;
  height: 100%;
}

.route-tabs {
  flex: 0 0 auto;
}

.zoom-level {
  margin-top: -10px;
}

.side-column {
  border-left: 1px solid var(--border);
  padding: 0;
  margin: 0;
}

.search-field {
  color: var(--text);
}

.label {
  font-weight: 300;
  color: var(--text);
}

.max-stat-input {
  width: 80px;
}
</style>
