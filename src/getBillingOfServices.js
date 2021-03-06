const { CostExplorer } = require('aws-sdk');
const { promisify } = require('util');
const usd2jpy = require('./usd2jpy');

class ExDate extends Date {
  format() {
    return this.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  }
}

const ce = new CostExplorer({ region: 'us-east-1' });
ce.getCostAndUsageAsync = promisify(ce.getCostAndUsage);

const now = new ExDate();
const Start = new ExDate(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).format();
const End = new ExDate(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0).format();

module.exports = async (total = false) => {
  const params = {
    TimePeriod: { Start, End },
    GroupBy: [{ Key: 'SERVICE', Type: 'DIMENSION' }],
    Granularity: 'MONTHLY',
    Metrics: ['BlendedCost'],
  };

  if (total) {
    delete params.GroupBy;
  }

  const { ResultsByTime: [{ Total, Groups }] } = await ce.getCostAndUsageAsync(params);

  return total
    ? { Total: await usd2jpy(Total.BlendedCost.Amount) }
    : Object.assign({}, ...await Promise.all(
      Groups.map(async ({ Keys: [Key], Metrics: { BlendedCost: { Amount } } }) => ({
        [Key]: await usd2jpy(Amount),
      })),
    ));
};
