import Vue from 'vue';

const JOB_STATUS = {
	INIT: 0,	// 尚未开始
	QUEUE: 1,	// 排队中
	RUNNING: 2,	// 执行中
	DONE: 3,	// 已完成
	FAILED: -1,	// 已失败
}

Vue.prototype.$JOB = JOB_STATUS

export default JOB_STATUS