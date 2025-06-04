import client from '@/store/api/client'

export default {
  getShot(shotId, callback) {
    return client.getModel('shots', shotId)
  },

  getShots(production, episode) {
    let path = '/api/data/shots/with-tasks'
    if (production) path += `?project_id=${production.id}`
    if (episode) path += `&episode_id=${episode.id}`
    return client.pget(path)
  },

  getSequence(sequenceId) {
    return client.getModel('sequences', sequenceId)
  },

  getSequences(production, episode, callback) {
    let path = `/api/data/projects/${production.id}/sequences`
    if (episode) path = `/api/data/episodes/${episode.id}/sequences`
    return client.pget(path)
  },

  getSequencesWithTasks(production, episode) {
    let path = `/api/data/sequences/with-tasks?project_id=${production.id}`
    if (episode) path += `&episode_id=${episode.id}`
    return client.pget(path)
  },

  getEpisode(episodeId) {
    return client.getModel('episodes', episodeId)
  },

  getEpisodes(production) {
    const path = `/api/data/projects/${production.id}/episodes`
    return client.pget(path)
  },

  getEpisodesWithTasks(production) {
    const path = `/api/data/episodes/with-tasks?project_id=${production.id}`
    return client.pget(path)
  },

  getShotType(callback) {
    client.get('/api/data/shot-type', callback)
  },

  newShot(shot) {
    const data = {
      name: shot.name,
      description: shot.description,
      sequence_id: shot.sequence_id
    }
    return client.ppost(`/api/data/projects/${shot.project_id}/shots`, data)
  },

  newSequence(sequence) {
    const data = {
      name: sequence.name,
      episode_id: sequence.episode_id,
      description: sequence.description,
      data: sequence.data
    }
    const path = `/api/data/projects/${sequence.project_id}/sequences`
    return client.ppost(path, data)
  },

  newEpisode(episode) {
    const data = {
      name: episode.name,
      description: episode.description || '',
      status: episode.status || 'running',
      data: episode.data || {}
    }
    const path = `/api/data/projects/${episode.project_id}/episodes`
    return client.ppost(path, data)
  },

  updateShot(shot) {
    const data = {
      name: shot.name,
      parent_id: shot.sequence_id,
      description: shot.description,
      data: shot.data
    }
    if (shot.is_casting_standby !== undefined) {
      data.is_casting_standby = Boolean(shot.is_casting_standby)
    }
    if (shot.nb_frames !== undefined) {
      if (shot.nb_frames !== null) {
        data.nb_frames = parseInt(shot.nb_frames)
      } else {
        data.nb_frames = null
      }
    }
    if (
      shot.frameOut !== undefined ||
      shot.frameIn !== undefined ||
      shot.fps !== undefined ||
      shot.resolution !== undefined ||
      shot.max_retakes !== undefined
    ) {
      Object.assign(data.data, {
        frame_in: shot.frameIn,
        frame_out: shot.frameOut,
        fps: shot.fps,
        resolution: shot.resolution,
        max_retakes: parseInt(shot.max_retakes)
      })
    }
    const path = `/api/data/entities/${shot.id}`
    return client.pput(path, data)
  },

  updateSequence(sequence) {
    const data = {
      name: sequence.name,
      description: sequence.description,
      data: sequence.data
    }
    return client.pput(`/api/data/entities/${sequence.id}`, data)
  },

  updateEpisode(episode) {
    const data = {
      name: episode.name,
      description: episode.description,
      status: episode.status,
      data: episode.data
    }
    if (episode.is_casting_standby !== undefined) {
      data.is_casting_standby = Boolean(episode.is_casting_standby)
    }
    return client.pput(`/api/data/entities/${episode.id}`, data)
  },

  deleteShot(shot) {
    if (shot.canceled) {
      return client.pdel(`/api/data/shots/${shot.id}?force=true`)
    } else {
      return client.pdel(`/api/data/shots/${shot.id}`)
    }
  },

  deleteSequence(sequence) {
    return client.pdel(`/api/data/sequences/${sequence.id}?force=true`)
  },

  deleteEpisode(episode) {
    return client.pdel(`/api/data/episodes/${episode.id}?force=true`)
  },

  restoreShot(shot, callback) {
    const data = { canceled: false }
    return client.pput(`/api/data/entities/${shot.id}`, data)
  },

  postCsv(production, formData, toUpdate) {
    let path = `/api/import/csv/projects/${production.id}/shots`
    if (toUpdate) path += '?update=true'
    return client.ppost(path, formData)
  },

  postEdl(production, edl_file, namingConvention, matchCase, episode) {
    const formData = new FormData()
    formData.append('file', edl_file)
    formData.append('naming_convention', namingConvention)
    formData.append('match_case', matchCase)
    let path = `/api/import/otio/projects/${production.id}`
    if (episode) path += `/episodes/${episode.id}`
    return client.ppost(path, formData)
  },

  getEpisodeStats(productionId) {
    return client.pget(`/api/data/projects/${productionId}/episodes/stats`)
  },

  getEpisodeRetakeStats(productionId) {
    const path = `/api/data/projects/${productionId}/episodes/retake-stats`
    return client.pget(path)
  },

  loadShotHistory(shotId) {
    return client.pget(`/api/data/shots/${shotId}/versions`)
  },

  getQuotas(productionId, taskTypeId, personId, detailLevel, computeMode) {
    if (personId) {
      return client.pget(
        `/api/data/projects/${productionId}/quotas/persons/` +
          `${personId}?detail=${detailLevel}&count_mode=${computeMode}`
      )
    } else {
      return client.pget(
        `/api/data/projects/${productionId}/quotas/` +
          `${taskTypeId}?detail=${detailLevel}&count_mode=${computeMode}`
      )
    }
  },

  getPeopleQuotas(productionId, personId, detailLevel, computeMode) {
    return client.pget(
      `/api/data/projects/${productionId}/quotas/person/` +
        `${personId}?detail=${detailLevel}&count_mode=${computeMode}`
    )
  },

  getStatusStats(
    productionId,
    taskTypeId,
    taskStatusIds,
    personId,
    detailLevel,
    countMode,
    userMode,
    from,
    to
  ) {
    // console.log('getStatusStats', {
    //   productionId: productionId,
    //   year: year,
    //   taskStatusIds: taskStatusIds,
    //   taskTypeId: taskTypeId,
    //   personId: personId,
    //   detailLevel: detailLevel,
    //   countMode: countMode,
    //   userMode: userMode
    // })
    // return [
    //   {
    //     date: '2025-05-08T10:47:38',
    //     person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
    //     is_first: true,
    //     task_status_id: '8a2741ba-6282-4d06-ad10-74b635afed16',
    //     value: 40
    //   },
    //   {
    //     date: '2025-05-08T10:47:38',
    //     person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
    //     is_first: true,
    //     task_status_id: 'bea1c54d-2fa0-4f0f-9613-b90510b56ad9',
    //     value: 40
    //   },
    //   {
    //     date: '2025-05-15T10:47:38',
    //     person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
    //     is_first: false,
    //     task_status_id: '8a2741ba-6282-4d06-ad10-74b635afed16',
    //     value: 10
    //   },
    //   {
    //     date: '2025-05-16T10:47:38',
    //     person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
    //     is_first: false,
    //     task_status_id: '8a2741ba-6282-4d06-ad10-74b635afed16',
    //     value: 10
    //   }
    // ]
    const query = {}
    if (taskTypeId) query.task_type_id = taskTypeId
    if (taskStatusIds && taskStatusIds.length > 0)
      query.task_status_id = taskStatusIds.join(',')

    if (personId) {
      if (userMode === 'person') query.person_id = personId
      else query.assignee_id = personId
    }
    if (detailLevel) query.level = detailLevel
    if (productionId) query.project_id = productionId

    if (userMode) {
      if (userMode === 'person') {
        query.user_mode = 'person'
      } else {
        query.user_mode = 'assignee'
      }
    }
    if (countMode) {
      if (countMode === 'count') {
        query.agg = 'count'
      } else {
        query.agg = 'sum'
        query.units = countMode
      }
    }
    if (from) query.created_at_from = from
    if (to) query.created_at_to = to

    // convert query to url params
    const urlParams = new URLSearchParams(query)
    return client.pget(`/api/data/task-status-logs/stats?${urlParams}`)
  },

  getStatusLogs(
    productionId,
    taskTypeId,
    taskStatusIds,
    personId,
    userMode,
    from,
    to
  ) {
    const query = {}
    if (taskTypeId) query.task_type_id = taskTypeId

    if (taskStatusIds && taskStatusIds.length > 0)
      query.task_status_id = taskStatusIds.join(',')

    if (personId) {
      if (userMode === 'person') query.person_id = personId
      else query.assignee_id = personId
    }
    if (productionId) query.project_id = productionId

    if (from) query.created_at_from = from
    if (to) query.created_at_to = to

    // convert query to url params
    const urlParams = new URLSearchParams(query)
    return client.pget(`/api/data/task-status-logs?${urlParams}`)
  },

  setNbFramesFromTaskTypePreviews(taskTypeId, productionId, episodeId) {
    let path =
      `/api/actions/projects/${productionId}/task-types/` +
      `${taskTypeId}/set-shot-nb-frames`
    if (episodeId) path += `?episode_id=${episodeId}`
    return client.ppost(path)
  }
}
