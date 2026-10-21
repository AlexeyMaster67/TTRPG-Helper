import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Animated2dDie } from '../components/dice/Animated2dDie';
import { Dice2dRollCard, Dice2dRollData } from '../components/dice/Dice2dRollCard';

describe('Animated2dDie Component', () => {
  it('renders d20 die with correct value', () => {
    const html = renderToString(
      <Animated2dDie
        sides={20}
        finalValue={18}
        isRolling={false}
      />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('18');
  });

  it('renders d100 die with tens values', () => {
    const html = renderToString(
      <Animated2dDie
        sides={100}
        finalValue={80}
        isRolling={false}
      />
    );
    expect(html).toContain('<svg');
    expect(html).toContain('80');
  });

  it('formats d100 final value 100 as 00', () => {
    const html = renderToString(
      <Animated2dDie
        sides={100}
        finalValue={100}
        isRolling={false}
      />
    );
    expect(html).toContain('00');
  });

  it('renders all polyhedral sides correctly', () => {
    const sides = [4, 6, 8, 10, 12, 20, 100];
    sides.forEach((s) => {
      const html = renderToString(
        <Animated2dDie sides={s} finalValue={s === 100 ? 50 : 3} isRolling={false} />
      );
      expect(html).toContain('<svg');
    });
  });
});

describe('Dice2dRollCard Component', () => {
  it('does NOT duplicate results when modifier is 0', () => {
    const rollData: Dice2dRollData = {
      sides: 20,
      r1: 11,
      kept: 11,
      modifier: 0,
      total: 11,
      mode: 'normal',
      isNat20: false,
      isNat1: false,
      title: 'Бросок d20',
    };

    const html = renderToString(
      <Dice2dRollCard
        data={rollData}
        onClose={() => {}}
        initialRolling={false}
      />
    );

    // Ensure the card contains 11
    expect(html).toContain('11');
    // Ensure there is NO redundant "d20(11) = 11" string in the card text
    expect(html).not.toContain('d20(11) = 11');
    expect(html).not.toContain('11 = 11');
  });

  it('displays mathematical formula cleanly when modifier is non-zero', () => {
    const rollData: Dice2dRollData = {
      sides: 20,
      r1: 14,
      kept: 14,
      modifier: 3,
      total: 17,
      mode: 'normal',
      isNat20: false,
      isNat1: false,
      title: 'Атака мечом',
    };

    const html = renderToString(
      <Dice2dRollCard
        data={rollData}
        onClose={() => {}}
        initialRolling={false}
      />
    );

    expect(html).toContain('+ 3');
    expect(html).toContain('17');
    expect(html).toContain('Атака мечом');
  });

  it('renders dual dice with advantage highlighting', () => {
    const rollData: Dice2dRollData = {
      sides: 20,
      r1: 19,
      r2: 4,
      kept: 19,
      modifier: 0,
      total: 19,
      mode: 'advantage',
      isNat20: false,
      isNat1: false,
      title: 'Атака с преимуществом',
    };

    const html = renderToString(
      <Dice2dRollCard
        data={rollData}
        onClose={() => {}}
        initialRolling={false}
      />
    );

    expect(html).toContain('Преимущество');
    expect(html).toContain('19');
    expect(html).toContain('4');
  });

  it('displays critical hit badge on Nat 20', () => {
    const rollData: Dice2dRollData = {
      sides: 20,
      r1: 20,
      kept: 20,
      modifier: 0,
      total: 20,
      mode: 'normal',
      isNat20: true,
      isNat1: false,
      title: 'Бросок d20',
    };

    const html = renderToString(
      <Dice2dRollCard
        data={rollData}
        onClose={() => {}}
        initialRolling={false}
      />
    );

    expect(html).toContain('КРИТИЧЕСКИЙ УСПЕХ (20)!');
  });

  it('renders a multi-dice pool (e.g. 4d6 damage) with all 4 dice and formula', () => {
    const rollData: Dice2dRollData = {
      dice: [
        { id: '1', sides: 6, value: 4 },
        { id: '2', sides: 6, value: 5 },
        { id: '3', sides: 6, value: 2 },
        { id: '4', sides: 6, value: 6 },
      ],
      modifier: 3,
      total: 20,
      mode: 'normal',
      title: 'Урон: Огненный шар',
      damageType: 'Огонь',
    };

    const html = renderToString(
      <Dice2dRollCard
        data={rollData}
        onClose={() => {}}
        initialRolling={false}
      />
    );

    // Checks that all individual dice values are rendered
    expect(html).toContain('4');
    expect(html).toContain('5');
    expect(html).toContain('2');
    expect(html).toContain('6');
    // Checks that formula includes [4 + 5 + 2 + 6]
    expect(html).toContain('4 + 5 + 2 + 6');
    expect(html).toContain('+ 3');
    expect(html).toContain('20');
    expect(html).toContain('Огонь');
    expect(html).toContain('Огненный шар');
  });
});
