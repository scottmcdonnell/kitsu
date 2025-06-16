import newsApi from '@/store/api/news'
import { sortByDate } from '@/lib/sorting'
import { formatFullDateWithTimezone } from '@/lib/time'

import {
  CLEAR_NEWS,
  ADD_PREVIOUS_NEWS,
  ADD_FIRST_NEWS,
  NEWS_ADD_PREVIEW,
  NEWS_SET_STATS,
  NEWS_SET_TOTAL,
  RESET_ALL
} from '@/store/mutation-types'

const initialState = {
  newsList: [],
  newsStats: {},
  newsTotal: 0
}

const state = {
  ...initialState
}

const getters = {
  newsList: state => state.newsList,
  newsTotal: state => state.newsTotal,
  newsStats: state => state.newsStats,

  newsListByDay: state => timezone => {
    if (state.newsList.length === 0) return []
    const listsByDay = []
    let runningList = []
    const tzDate = formatFullDateWithTimezone(
      state.newsList[0].created_at,
      timezone
    )
    let currentDay = tzDate.substring(0, 10)

    state.newsList.forEach(news => {
      const newsDay = formatFullDateWithTimezone(
        news.created_at,
        timezone
      ).substring(0, 10)
      if (newsDay !== currentDay) {
        listsByDay.push(runningList)
        currentDay = newsDay
        runningList = []
      }
      runningList.push(news)
    })

    if (runningList.length !== 0) {
      listsByDay.push(runningList)
    }

    return listsByDay
  }
}

const actions = {
  async loadNews({ commit, state }, params) {
    commit(CLEAR_NEWS)
    const newsList = await newsApi.getLastNews(params)
    commit(ADD_PREVIOUS_NEWS, newsList.data)
    commit(NEWS_SET_TOTAL, newsList.total)
    commit(NEWS_SET_STATS, newsList.stats)
  },

  async loadMoreNews({ commit, state }, params) {
    const newsList = await newsApi.getLastNews(params)
    commit(ADD_PREVIOUS_NEWS, newsList.data)
  },

  async loadSingleNews({ commit, state }, { productionId, newsId }) {
    const news = await newsApi.getNews(productionId, newsId)
    return commit(ADD_FIRST_NEWS, news)
  },

  async loadNewsStats({ commit, state }, { productionId, ...params }) {
    const statsData = await newsApi.getNewsStats(productionId, params)

    // restructure the stats to be grouped by task_type > author > detail level
    if ('detail' in params) return groupStats(statsData, params.detail)

    return statsData
  }
}

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
const groupStats = (stats, detailLevel = 'day') => {
  return stats.reduce((groupedStats, stat) => {
    const taskTypeId = stat.task_type_id
    const authorId = stat.author_id
    const timeKey = stat[detailLevel] || stat.date

    if (!groupedStats[taskTypeId]) groupedStats[taskTypeId] = {}
    if (!groupedStats[taskTypeId][authorId])
      groupedStats[taskTypeId][authorId] = {}
    if (!groupedStats[taskTypeId][authorId][timeKey])
      groupedStats[taskTypeId][authorId][timeKey] = {}

    if (!groupedStats[taskTypeId][authorId][timeKey][stat.task_status_id])
      groupedStats[taskTypeId][authorId][timeKey][stat.task_status_id] = {
        initial_status: {
          nb_frames: 0,
          nb_seconds: 0,
          nb_drawings: 0,
          count: 0
        },
        repeat_status: {
          nb_frames: 0,
          nb_seconds: 0,
          nb_drawings: 0,
          count: 0
        },
        date: timeKey
      }

    const groupedStat =
      groupedStats[taskTypeId][authorId][timeKey][stat.task_status_id]

    // For news data, we'll count based on initial_status
    // if true its the first occurance of the status for the task
    // if false its a retake of the status for the task
    if (stat.initial_status) {
      groupedStat.initial_status.count += 1
      groupedStat.initial_status.nb_frames += stat.nb_frames
      groupedStat.initial_status.nb_seconds += stat.nb_seconds
      groupedStat.initial_status.nb_drawings += stat.nb_drawings
    } else {
      groupedStat.repeat_status.count += 1
      groupedStat.repeat_status.nb_frames += stat.nb_frames
      groupedStat.repeat_status.nb_seconds += stat.nb_seconds
      groupedStat.repeat_status.nb_drawings += stat.nb_drawings
    }
    return groupedStats
  }, {})
}

const mutations = {
  [CLEAR_NEWS](state) {
    state.newsList = []
    state.newsTotal = 0
  },

  [ADD_PREVIOUS_NEWS](state, newsList) {
    state.newsList = state.newsList.concat(sortByDate(newsList))
  },

  [ADD_FIRST_NEWS](state, news) {
    const existingNews = state.newsList.find(n => n.id === news.id)
    if (existingNews) {
      Object.assign(existingNews, news)
    } else {
      state.newsList.unshift(news)
    }
  },

  [NEWS_ADD_PREVIEW](state, { commentId, previewId, extension }) {
    if (!commentId) return
    const news = state.newsList.find(news => news.comment_id === commentId)
    if (news) {
      news.preview_file_id = previewId
      news.preview_file_extension = extension
    }
  },

  [NEWS_SET_TOTAL](state, count) {
    state.newsTotal = count
  },

  [NEWS_SET_STATS](state, stats) {
    state.newsStats = stats
  },

  [RESET_ALL](state) {
    Object.assign(state, { ...initialState })
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
