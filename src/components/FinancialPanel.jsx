import React from 'react';
import {
  calculateSurvivalLine,
  calculateTargetLine,
} from '../models/financialGuardrails.js';
import { getCopy } from '../models/terminology.js';

function NumberField({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function FinancialPanel({
  mode,
  financial,
  targetMonthlyIncome,
  onChange,
}) {
  const { monthlyFixedCost, unitPrice, unitCost } = financial;
  const survival = calculateSurvivalLine({ monthlyFixedCost, unitPrice, unitCost });
  const target = calculateTargetLine({
    monthlyFixedCost,
    unitPrice,
    unitCost,
    targetMonthlyIncome,
  });

  const setField = (key) => (value) => onChange({ ...financial, [key]: value });

  return (
    <section className="card">
      <h2>{getCopy('survivalLine', mode)}</h2>

      <div className="field-grid">
        <NumberField
          label={getCopy('monthlyFixedCost', mode)}
          value={monthlyFixedCost}
          onChange={setField('monthlyFixedCost')}
        />
        <NumberField
          label={getCopy('unitPrice', mode)}
          value={unitPrice}
          onChange={setField('unitPrice')}
        />
        <NumberField
          label={getCopy('unitCost', mode)}
          value={unitCost}
          onChange={setField('unitCost')}
        />
      </div>

      {survival.viable ? (
        <div className="verdict verdict-ok">
          <p>
            {getCopy('unitMargin', mode)}：<strong>{survival.unitMargin}</strong>
          </p>
          <p className="big-number">
            每月 <strong>{survival.unitsToSurvive}</strong> 個單位
          </p>
          {target.viable && targetMonthlyIncome > 0 && (
            <p>
              {getCopy('targetLine', mode)}（{targetMonthlyIncome} 元）：
              每月 <strong>{target.unitsToTarget}</strong> 個單位
            </p>
          )}
        </div>
      ) : (
        <div className="verdict verdict-danger">
          <p>{getCopy('notViable', mode)}</p>
        </div>
      )}
    </section>
  );
}
